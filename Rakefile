def gem_opt
  defined?(Gem) ? "-rubygems" : ""
end

# --------------------------------------------------
# Tests
# --------------------------------------------------
task(:default => "test:all")

namespace(:test) do

  desc "Run all tests"
  task(:all) do
    exit system("ruby #{gem_opt} -I.:lib:test -e'%w( #{Dir['test/**/*_test.rb'].join(' ')} ).each {|p| require p }'")
  end

  desc "Run all tests on multiple ruby versions (requires rvm)"
  task(:portability) do
    versions = %w(  1.8.6  1.8.7  )
    versions.each do |version|
      system <<-BASH
        bash -c 'source ~/.rvm/scripts/rvm;
                 rvm use #{version};
                 echo "--------- #{version} ----------";
                 rake -s test:all'
      BASH
    end
  end
end

# --------------------------------------------------
# Docs
# --------------------------------------------------
desc "Generate YARD Documentation"
task :yardoc do
  require 'yard'
  YARD::CLI::Yardoc.run *%w( --no-private --no-highlight -o doc/yard --readme README.md --markup markdown - LICENSE )
end

