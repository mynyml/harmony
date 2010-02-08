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

  test "casting to string" do
    assert_equal "<html><head><title></title></head><body></body></html>", Page.new.to_s
  end

  private
    def tempfile(content)
      Tempfile.open('abc') {|f| f << content; @__path = f.path }
      @__path
    end
end
