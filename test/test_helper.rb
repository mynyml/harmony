require 'pathname'
require 'minitest/autorun'

begin require 'ruby-debug'; rescue; end
begin require 'redgreen'  ; rescue; end
begin require 'phocus'    ; rescue; end

require Pathname(__FILE__).dirname.parent + 'lib/harmony'

class MiniTest::Unit::TestCase
  def self.test(name, &block)
    define_method("test_#{name}".gsub(/\s/,'_'), &block)
  end
end
