Harmony
=======

                       .,ad88888888baa,
                   ,d8P"""        ""9888ba.
                .a8"          ,ad88888888888a
               aP'          ,88888888888888888a
             ,8"           ,88888888888888888888,
            ,8'            (888888888( )888888888,
           ,8'             `8888888888888888888888
           8)               `888888888888888888888,
           8                  "8888888888888888888)
           8                   `888888888888888888)
           8)                    "8888888888888888
           (b                     "88888888888888'
           `8,        (8)          8888888888888)
            "8a                   ,888888888888)
              V8,                 d88888888888"
               `8b,             ,d8888888888P'
                 `V8a,       ,ad8888888888P'
                    ""88888888888888888P"
                         """"""""""""

Summary
-------

Harmony allows evaluating javascript + DOM code within ruby.

Features
--------

Harmony is:

* Very simple to use
* An attempt to harmonize ruby + javascript + DOM + command-line
* As harmonious as yin yang and Tenderheart Bear
* Particularly corny

Examples
--------

Are you in your Bo-Zone, Bo-Bodies? Here's our new Animove!

### Simple Javascript Parsing

    require 'harmony'

    page = Harmony::Page.new(<<-HTML)
      <html>
        <head>
          <title>Foo</title>
        </head>
        <body></body>
      </html>
    HTML

    page.execute_js("1+1")            #=> 2
    page.execute_js("document.title") #=> "Foo"

The Page object's `#execute_js` method (aliased as `#x` for convenience) takes a
string of javascript code, executes it and returns the last statement's value
(just like a ruby method).

### Javascript Unit Tests

One interesting use of Harmony is to test your javascript code within your ruby
application's own tests (test/unit, minitest, RSpec, nanotest, etc). Which
consequently means that you can now run _browser-less, fully command-line
based, DOM-javascript tests_.

    require 'test/unit'
    require 'harmony'

    class JavascriptTest < Test::Unit::TestCase
      def setup
        @page = Harmony::Page.new
        @page.execute_js(File.read('public/javascripts/foo.js'))
      end

      def test_foo
        assert_equal "world", @page.execute_js(<<-JS)
          foo = new Foo;
          foo.hello;
        JS
      end
    end

### DOM Handling

Harmony's knowledge of the DOM means it can even parse client-side js frameworks,
like JQuery, Prototype, etc.

    require 'harmony'

    page = Harmony::Page.new(<<-HTML)
      <html>
        <head></head>
        <body>
          <div id="widget">ohaie</div>
        </body>
      </html>
    HTML
    page.execute_js( File.read('path/to/jquery.js') )
    page.execute_js( "$('#widget').innerHTML" ) #=> "ohaie"

### Fetching Documents

`Harmony::Page.fetch(uri)` allows creating a page from a remote document.

    require 'harmony'

    page = Harmony::Page.fetch('http://example.com')
    page.execute_js('document.title') #=> "Example Web Page"

`fetch` also accepts "file://" uris.

Acknowledgement
---------------

Harmony is only a very thin DSL wrapper around two **amazing** libs,
[Johnson][1] and [Envjs][2]. The authors/contributors of those libs have been
doing a huge amount of great work for quite a while, so please go recommend
them on on WorkingWithRails right now and/or follow them on github:

  [jbarnette][3], [tenderlove][4], [smparkes][5], [wycats][6], [matthewd][7], [thatcher][8], [jeresig][9]

Special thanks go to [smparkes][10] for his patient help, and for providing the
last bit of glue that made everything work together.

Links
-----
* code: <http://github.com/mynyml/harmony>
* docs: <http://yardoc.org/docs/mynyml-harmony>
* wiki: <http://wiki.github.com/mynyml/harmony>
* bugs: <http://github.com/mynyml/harmony/issues>



[1]:  http://github.com/jbarnette/johnson/
[2]:  http://env-js.appspot.com/
[3]:  http://www.workingwithrails.com/person/10668-john-barnette
[4]:  http://github.com/tenderlove/
[5]:  http://www.workingwithrails.com/person/11739-steven-parkes
[6]:  http://www.workingwithrails.com/person/1805-yehuda-katz
[7]:  http://www.workingwithrails.com/person/6221-matthew-draper
[8]:  http://github.com/thatcher/
[9]:  http://ejohn.org/
[10]: http://github.com/smparkes/

