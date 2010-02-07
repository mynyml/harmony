require 'test/test_helper'

class PageTest < MiniTest::Unit::TestCase
  include Harmony

  PAGE = Page.new(<<-HTML)
    <html>
      <head>
        <title>Foo</title>
      </head>
      <body></body>
    </html>
  HTML

  test "api" do
    assert_respond_to Page, :fetch
    assert_respond_to Page, :new
    assert_respond_to PAGE, :window
    assert_respond_to PAGE, :window=
    assert_respond_to PAGE, :document
    assert_respond_to PAGE, :execute_js
    assert_respond_to PAGE, :x
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
    Tempfile.open('testdoc') {|f| f << <<-HTML; @path = f.path }
      <html><head><title>foo</title></head><body></body></html>
    HTML

    page = Page.fetch("file://#{@path}")
    assert_equal 'foo', page.document.title
  end

  test "default window" do
    assert_empty Page.new.document.title
  end
end
