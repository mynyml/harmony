require 'pathname'
require 'tempfile'

require 'johnson/tracemonkey'
require 'envjs/runtime'

module Harmony
  class Page

    # Window factory
    #
    # @private
    module Window #:nodoc:
      extend self

      # Cache the initial runtime. Parsing env.js (done automatically when
      # Envjs::Runtime is extended) takes a while, so we only want to do this
      # once.
      #
      # @private
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

    # Create page from remote document.
    #
    # @example
    #
    #     Page.fetch('http://montrealrb.org')
    #     Page.fetch('http://localhost:3000')
    #     Page.fetch('file:///home/mynyml/www/foo/index.html')
    #
    # @param [String] uri
    #   uri to fetch document from
    #
    # @return [Page]
    #   new page object preloaded with fetched document
    #
    def self.fetch(uri)
      page = new
      page.instance_variable_set(:@window, Window.from_uri(uri))
      page
    end

    # Create new page containing given document.
    #
    # @param [String] document
    #   HTML document. Defaults to an "about:blank" window, with the basic
    #   structure: `<html><head><title></title></head><body></body></html>`
    #
    def initialize(document=nil)
      @window = Window.from_document(document) if document
    end

    # Load one or more javascript files in page's context
    #
    # @param [#to_s, #to_s, ...] paths
    #   paths to js file
    # @return [Page] self
    #
    def load(*paths)
      paths.flatten.each do |path|
        window.load(path.to_s)
      end
      self
    end

    # Evaluate Javascript code within this page's context.
    #
    # @param [String] code
    #   javascript code to execute
    #
    # @return [Object]
    #   last javascript statement's value, cast to a ruby object
    #
    def execute_js(code)
      window.evaluate(code)
    end
    alias :x :execute_js

    # DOM document's `window` object. Equivalent to the return value of
    # `page.execute_js('window')`
    #
    # @return [Object]
    #   window DOM object
    #
    def window
      @window ||= Window.blank
    end

    # Convenience method, equivalent to the return value of
    # `page.execute_js('window.document')`
    #
    # @return [Object]
    #   document DOM object
    #
    def document
      window.document
    end
  end
end

