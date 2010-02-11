require 'lib/harmony'

Gem::Specification.new do |s|
  s.name                = "harmony"
  s.summary             = "Javascript + DOM in your ruby, the simple way"
  s.description         = "yo dawg, i heard you liked developing web apps while using ruby on the cmd line, so i added javascript and a DOM in your ruby so you could js the dom without browser while you code in your editor"
  s.author              = "mynyml"
  s.email               = "mynyml@gmail.com"
  s.homepage            = "http://github.com/mynyml/harmony"
  s.rubyforge_project   = "harmony"
  s.require_path        = "lib"
  s.version             =  Harmony::VERSION
  s.files               =  File.read("Manifest").strip.split("\n")

  s.add_dependency 'johnson', '2.0.0.pre0'
  s.add_development_dependency 'minitest'
end
