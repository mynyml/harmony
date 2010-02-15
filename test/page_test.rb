require 'test/test_helper'

class PageTest < MiniTest::Unit::TestCase
  include Harmony

  PAGE = Page.new

  test "api" do
    assert_respond_to Page, :fetch
    assert_respond_to Page, :new
    assert_respond_to PAGE, :window
    assert_respond_to PAGE, :document
    assert_respond_to PAGE, :execute_js
    assert_respond_to PAGE, :x
    assert_respond_to PAGE, :to_s
  end

  test "document shortcut" do
    assert_equal PAGE.window.document, PAGE.document
  end

  test "executes javascript" do
    assert_equal 7, PAGE.x('5+2')
  end

  test "excutes DOM-accessing javascript" do
    page = Page.new(<<-HTML)
      <html>
        <head>
          <title>Harmony</title>
        </head>
        <body>
          <div></div>
          <div></div>
        </body>
      </html>
    HTML
    assert_equal 'Harmony', page.document.title
    assert_equal 2, page.x(<<-JS)
      document.getElementsByTagName('div').length
    JS
  end

  test "fetches remote document" do
    path = tempfile(<<-HTML)
      <html><head><title>foo</title></head><body></body></html>
    HTML
    page = Page.fetch("file://#{path}")
    assert_equal 'foo', page.document.title
  end

  test "default window" do
    assert_empty Page.new.document.title
  end

  test "loads javascript file" do
    path = tempfile(<<-HTML)
      function foo() { return 'bar' };
    HTML
    page = Page.new.load(path)
    assert_equal 'bar', page.x('foo()')
  end

  test "can load multiple files as array" do
    paths = []
    paths << tempfile(<<-HTML)
      function foo() { return 'bar' };
    HTML
    paths << tempfile(<<-HTML)
      function moo() { return 'boo' };
    HTML

    page = Page.new.load(paths)
    assert_equal 'bar', page.x('foo()')
    assert_equal 'boo', page.x('moo()')
  end

  test "can load multiple files as splat" do
    paths = []
    paths << tempfile(<<-HTML)
      function foo() { return 'bar' };
    HTML
    paths << tempfile(<<-HTML)
      function moo() { return 'boo' };
    HTML

    page = Page.new.load(*paths)
    assert_equal 'bar', page.x('foo()')
    assert_equal 'boo', page.x('moo()')
  end

  private
    def tempfile(content)
      Tempfile.open('abc') {|f| f << content; @__path = f.path }
      @__path
    end
end
