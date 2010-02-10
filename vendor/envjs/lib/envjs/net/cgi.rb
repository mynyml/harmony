require 'net/protocol'

require 'envjs/net'

class Envjs::Net::CGI

  def save_and_set k, v
    @saved[k] = ENV[k]
    ENV[k] = v
  end

  def restore
    @saved.keys.each do |k|
      ENV[k] = @saved[k]
    end
    @saved = {}
  end

  def initialize xhr, data
    if (match = %r((.*\.php)(\?(.*))?).match xhr.url).nil?
      raise "Not CGI"
    end

    @saved = {}

    begin

      # p match[0]

      path = match[1]
      path.sub! %r(^file://), ""

      save_and_set( "GATEWAY_INTERFACE", "CGI/1.1" )

      save_and_set( "REQUEST_METHOD", xhr["method"] )
      if ( match[3] )
        save_and_set( "QUERY_STRING", match[3] )
      end

      if ct = xhr["headers"]["Content-Type"]
        save_and_set( "CONTENT_TYPE", ct )
      end

      if data
        save_and_set( "CONTENT_LENGTH", data.length.to_s )
      end

      xhr["headers"].each do |k,v|
        k.gsub!("-","_")
        k = "HTTP_"  + k
        save_and_set( k, v )
      end

      result = nil

      save_and_set( "PATH_INFO",  path )
      save_and_set( "PATH_TRANSLATED",  path )
      save_and_set( "REDIRECT_STATUS", "200" )

      open("|php-cgi", "r+") do |php|
        if data
          php.write data
          php.flush
        end
        result = php.read
      end

      result && result = result.split("\r\n")
      @headers = {}
      while line = result.shift
        break if line == ""
        match = /([^:]*):\s*(.*)/.match line
        @headers[match[1]]=match[2]
      end
      # p "q", result.join("\r\n")
      @body = result.join("\r\n")
    ensure
      restore
    end

  end

  def each 
    @headers.each do |k,v|
      yield k, v
    end
  end

  def finish
  end

  attr_reader :body

end
