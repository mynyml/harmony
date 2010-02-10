require 'net/protocol'

require 'envjs/net'

class Envjs::Net::File < Net::Protocol

  class << self
    attr_accessor :on_open
  end

  class Get
    attr_accessor :path
    def initialize path
      @path = path
    end
  end

  def initialize host, port
  end

  def self.start host, port
    new( host, port ).start
  end

  def start
    self
  end

  def finish
  end

  def request request
    Response.new request.path
  end

  class Response
    def initialize path
      @path = path
      on_open = Envjs::Net::File.on_open
      on_open and on_open.call( path )
      @file = File.new @path
      @body = @file.read
      @code = @file.nil? ? "404" : "200";
      @file.close
    end

    def [] *args
      nil
    end

    def each &block
    end

    def getHeaderFields
      []
    end

    def getContentEncoding
      nil
    end

    def getResponseCode
      @file.nil? ? 404 : 200;
    end


    def getInputStream
      self
    end

    attr_reader :body, :code

  end

end
