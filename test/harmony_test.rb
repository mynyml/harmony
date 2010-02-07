require 'test/test_helper'

class HarmonyTest < MiniTest::Unit::TestCase
  test "version" do
    refute_nil Harmony::VERSION
  end
end

