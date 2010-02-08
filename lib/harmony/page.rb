require 'tempfile'

require 'johnson/tracemonkey'
require 'envjs/runtime'

module Harmony
  class Page

    # window factory
    module Window #:nodoc:
      extend self

      BASE_RUNTIME = Johnson::Runtime.new
      BASE_RUNTIME.extend(Envjs::Runtime)

      def from_uri(uri)
        BASE_RUNTIME.evaluate("window.open('#{uri}')")
      end

      def from_document(document)
        Tempfile.open('harmony') {|f| f << document; @path = f.path }
        from_uri("file://#{@path}")
      end

      def blank
        from_uri('about:blank')
      end
    end

    def self.fetch(uri)
      new.tap {|page| page.window = Window.from_uri(uri) }
    end

    attr_writer :window

    def window
      @window ||= Window.blank
    end

    def initialize(document=nil)
      @window = Window.from_document(document) if document
    end

    # Evaluate Javascript code within this page's context
    def execute_js(code)
      window.evaluate(code)
    end
    alias :x :execute_js

    def document
      window.document
    end

    def to_s
      document.innerHTML
    end
  end
end

