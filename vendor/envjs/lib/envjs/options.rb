require 'optparse'

$envjsrb_deps = nil

OptionParser.new do |o|

  o.on("--deps path") do |path|
    $envjsrb_deps = path
  end

end.parse!
