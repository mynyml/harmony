require 'envjs'
require "open-uri"
require 'pathname'
begin
  require 'fsdb'
rescue LoadError; end
require 'envjs/net/file'

module Envjs::Runtime

  def self.extended object
    object.instance_eval do

      evaluate <<'EOJS'
print = function() {
  var l = arguments.length
  for( var i = 0; i < l; i++ ) {
    var s;
    if ( arguments[i] === null ) {
      s = "null";
    } else if ( arguments[i] === undefined  ) {
      s = "undefined"      
    } else {
      s = arguments[i].toString();
    }
    Ruby.print(s);
    if( i < l-1 ) {
      Ruby.print(" ");
    }
  }
  Ruby.print("\n");
  Ruby['$stdout'].flush();
};
EOJS

      evaluate <<'EOJS'
debug = function() {
  var l = arguments.length
  for( var i = 0; i < l; i++ ) {
    var s;
    if ( arguments[i] === null ) {
      s = "null";
    } else if ( arguments[i] === undefined  ) {
      s = "undefined"      
    } else {
      s = arguments[i].toString();
    }
    Ruby['$stderr'].print(s);
    if( i < l-1 ) {
      Ruby['$stderr'].print(" ");
    }
  }
  Ruby['$stderr'].print("\n");
};
EOJS

      evaluate <<'EOJS'
puts = function() {
  var l = arguments.length
  for( var i = 0; i < l; i++ ) {
    var s;
    if ( arguments[i] === null ) {
      s = "null";
    } else if ( arguments[i] === undefined  ) {
      s = "undefined"      
    } else {
      s = arguments[i].toString();
    }
    Ruby.print(s);
    Ruby.eval("$stdout.flush")
  }
};
EOJS

      master = global["$master"] = evaluate("new Object")
      master.symbols = [ "Johnson", "Ruby", "print", "debug", "puts", "load", "reload", "whichInterpreter", "multiwindow" ]
      master.symbols.each { |symbol| master[symbol] = global[symbol] }

      master.whichInterpreter = "Johnson"

      master.multiwindow = true

      # calling this from JS is hosed; the ruby side is confused, maybe because HTTPHeaders is mixed in?
      master.add_req_field = lambda { |r,k,v| r.add_field(k,v) }

      db = lambda do
        $envjsrb_deps && ( @db ||= FSDB::Database.new $envjsrb_deps )
      end

      top_level_js = nil

      add_dep = nil
      
      clear_deps = lambda do |w|
        begin
          if db.call
            loc = w
            begin loc = w.location; rescue; end
            loc && ( loc = loc.to_s )
            if ( loc !~ %r((http?s|file|about):) )
              begin
                loc = "file://" + Pathname(loc).realpath.to_s
              rescue Errno::ENOENT; end
            end
            # $stderr.puts "clear", loc
            if loc and loc != "about:blank"
              paths = db.call[loc+".on.yml"] || []
              paths.each do |path|
                # $stderr.print "#{path} not by #{loc}\n";
                db.call[path+".by.yml"].delete loc
              end
              # $stderr.print "#{loc} not on anything\n";
              db.call.delete loc+".on.yml"
            end
          end
          add_dep.call( nil, loc )
        rescue Exception => e; $stderr.puts e, e.class; $stderr.puts e.backtrace; end
      end

      if $envjsrb_deps
        Envjs::Net::File.on_open = clear_deps
      end
      
      add_dep = lambda do |w, f|
        if db.call
          loc = nil
          begin loc = w.location; rescue Exception; end
          loc && ( loc = loc.to_s )
          if ( loc && loc !~ %r((http?s|file|about):) )
            loc = "file://" + Pathname(loc).realpath.to_s
          end
          path = f
          if ( path !~ %r((http?s|file|about):) )
            begin
              path = "file://" + Pathname(path).realpath.to_s
            rescue Errno::ENOENT
              return
            end
          end
          if !loc || loc == "about:blank"
            uri = URI.parse top_level_js
            if uri.scheme == nil
              uri.scheme = "file"
              begin
                uri.path = Pathname.new(uri.path).realpath.to_s
              rescue Errno::ENOENT; end
              uri = URI.parse uri.to_s
            end
            uri_s = uri.to_s.sub %r(^file:/([^/])), 'file:///\1'

            # tll = "file://" + Pathname(top_level_js).realpath.to_s

            tll = uri_s

            if ( tll != path ) 
              loc = tll
            end
          end
          if loc and loc != "about:blank"
            on = db.call[loc+".on.yml"] || []
            on << path
            on.uniq!
            db.call[loc+".on.yml"] = on
            by = db.call[path+".by.yml"] || []
            by << loc
            by.uniq!
            db.call[path+".by.yml"] = by
            # $stderr.print "#{loc} on #{path}: #{db.call[loc+'.on.yml'].join(' ')}\n"
            # $stderr.print "#{path} by #{loc}: #{db.call[path+'.by.yml'].join(' ')}\n"
          end
        end
      end

      (class << self; self; end).send :define_method, :top_level_load do |path|
        # $stderr.print "tll #{path}\n"
        top_level_js = path
        clear_deps.call( path )
      end

      master.load = lambda { |*files|
        if files.length == 2 && !(String === files[1])
          f = files[0]
          w = files[1]

          # Hmmm ...
          uri = URI.parse f

          if uri.scheme == nil
            uri.scheme = "file"
            begin
              uri.path = Pathname.new(uri.path).realpath.to_s
            rescue Errno::ENOENT; end
            uri = URI.parse uri.to_s
          end

          uri_s = uri.to_s.sub %r(^file:/([^/])), 'file:///\1'

          if uri.scheme == "file"
            uri_s = uri.path
          elsif uri.scheme == "data"
            raise "implement 0"
          end

          v = open(uri_s).read.gsub(/\A#!.*$/, '')
          loc = nil
          add_dep.call w, f
          evaluate(v, f, 1, w, w, f)
        else
          load *files
        end
      }

      def load *files
        files.map { |f|
          # Hmmm ...

          uri = URI.parse f
          if uri.scheme == nil
            uri.scheme = "file"
            begin
              uri.path = Pathname.new(uri.path).realpath.to_s
            rescue Errno::ENOENT; end
            uri = URI.parse uri.to_s
          end
          uri_s = uri.to_s.sub %r(^file:/([^/])), 'file:///\1'
          
          if uri.scheme == "file"
            super uri.path
          elsif uri.scheme == "data"
            raise "implement 1"
          else
            raise "hell 1"
          end

          # v = open(uri_s).read.gsub(/\A#!.*$/, '')
          # loc = nil
          # add_dep.call w, f
          # evaluate(v, f, 1, w, w, f)
          # evaluate(File.read(f).gsub(/\A#!.*$/, ''), f, 1)

        }.last
      end

      master.reload = lambda { |*files|
        if files.length == 2 && !(String === files[1])
          f = files[0]
          w = files[1]
          v = open(f).read.gsub(/\A#!.*$/, '')
          loc = nil
          add_dep.call w, f
          reevaluate(v, f, 1, w, w, f)
        else
          reload *files
        end
      }

      master.evaluate = lambda { |v,w|
        evaluate(v,"inline",1,w,w);
      }

      master.new_split_global_outer = lambda { new_split_global_outer }
      master.new_split_global_inner = lambda { |outer,_| new_split_global_inner outer }

      # create an proto window object and proxy

      outer = new_split_global_outer
      window = inner = new_split_global_inner( outer )

      master.symbols.each do |symbol|
        window[symbol] = master[symbol]
      end

      master.first_script_window = window

      window["$master"] = master
      window["$options"] = evaluate("new Object");
      window["$options"].proxy = outer

      window.evaluate = lambda { |s|
        return master.evaluate.call(s,window);
      }

      window.load = lambda { |*files|
        files.each do |f|
          master.load.call f, window
        end
      }

      window.reload = lambda { |*files|
        files.each do |f|
          master.reload.call f, window
        end
      }

      ( class << self; self; end ).send :define_method, :wait do
        master["finalize"] && master.finalize.call
        master.timers && master.timers.wait
      end

      scripts = {}

      ( class << self; self; end ).send :define_method, :become_first_script_window do
        # p "heh", inner, master.first_script_window
        inner = master.first_script_window
      end

      ( class << self; self; end ).send :define_method, :evaluate do |*args|
        ( script, file, line, global, scope, fn ) = *args
        # print "eval in " + script[0,50].inspect + (scope ? scope.toString() : "nil") + "\n"
        global = nil
        scope ||= inner
        if fn
          compiled_script = scripts[fn]
        end
        # compiled_script = compile(script, file, line, global)
        compiled_script ||= compile(script, file, line, global)
        if fn && !scripts[fn]
          scripts[fn] = compiled_script
        end
        # p "?", script
        evaluate_compiled_script(compiled_script,scope)
      end

      ( class << self; self; end ).send :define_method, :reevaluate do |*args|
        ( script, file, line, global, scope, fn ) = *args
        # print "eval in " + script[0,50].inspect + (scope ? scope.toString() : "nil") + "\n"
        global = nil
        scope ||= inner
        compiled_script = compile(script, file, line, global)
        if fn
          scripts[fn] = compiled_script
        end
        evaluate_compiled_script(compiled_script,scope)
      end

      @envjs = inner

      ( class << self; self; end ).send :define_method, :"[]" do |key|
        key == "this" && evaluate("this") || @envjs[key]
      end

      ( class << self; self; end ).send :define_method, :"[]=" do |k,v|
        @envjs[k] = v
      end

      load Envjs::ENVJS

    end
  end

end
