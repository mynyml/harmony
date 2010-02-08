require 'minitest/autorun'

begin require 'ruby-debug'; rescue LoadError; end
begin require 'redgreen'  ; rescue LoadError; end
begin require 'phocus'    ; rescue LoadError; end

require 'lib/harmony'

class MiniTest::Unit::TestCase
  def self.test(name, &block)
    define_method("test_#{name}".gsub(/\s/,'_'), &block)
  end
end
