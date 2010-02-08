# Run me with:
#   $ watchr docs.watchr

require 'yard'
# --------------------------------------------------
# Rules
# --------------------------------------------------
watch( 'lib/.*\.rb' ) { yard }
watch( 'README.md'  ) { yard }

# --------------------------------------------------
# Signal Handling
# --------------------------------------------------
Signal.trap('QUIT') { yard        } # Ctrl-\
Signal.trap('INT' ) { abort("\n") } # Ctrl-C

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def yard
  print "Updating yardocs... "; STDOUT.flush
  YARD::CLI::Yardoc.run *%w( --no-private --no-highlight -o doc/yard --readme README.md --markup markdown - LICENSE )
  print "done\n"
end

