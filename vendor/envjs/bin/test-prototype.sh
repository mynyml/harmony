#!/bin/sh

# Usage: test-prototype.sh [version]
# Currently supported versions: 1.6.0.3
#
# This script will check out the Prototype development tree from Github if necessary,
# massage the testing scripts as necessary, copy our latest version of env.js into place,
# and then run the test scripts.


if [ -n "$2" ]; then 
    echo 'debug'
    if [ -n "$2" ]; then VERSION="$2"; else VERSION="1.6.0.3"; fi
    DEBUG=1
else 
    echo 'jquery'
    if [ -n "$1" ]; then VERSION="$1"; else VERSION="1.6.0.3"; fi
    DEBUG=0
fi

PROTOTYPE_DIR="test/vendor/Prototype/$VERSION";

ant concat

if [ ! -d "$PROTOTYPE_DIR" ]; then
    git clone git://github.com/sstephenson/prototype.git $PROTOTYPE_DIR
    # - prepares tests - #
    cd $PROTOTYPE_DIR
    git submodule init #allow prototype to discover test framework dependencies
    git submodule update #load the dicovered dependencies
    cd -
fi

#replace thier test html template erb (malformed html on purpose..really???)
cat bin/prototype_1.6.0.3_tmpl.txt > $PROTOTYPE_DIR/test/unit/templates/default.erb
sed 's/runner\.run/ /g' $PROTOTYPE_DIR/Rakefile > $PROTOTYPE_DIR/Rakefile
cd $PROTOTYPE_DIR
rake test 
cd -

cp dist/env.rhino.js $PROTOTYPE_DIR/test/unit/tmp/env.js
cp dist/env-js.jar $PROTOTYPE_DIR/test/unit/tmp/env-js.jar
cp bin/prototype-$VERSION-test.js $PROTOTYPE_DIR/test/unit/tmp/test.js


cd $PROTOTYPE_DIR/test/unit/tmp
if [ $DEBUG -eq 1 ]; then
    echo 'running with rhino debugger'
    java -cp env-js.jar org.mozilla.javascript.tools.envjs.Main test.js;
else
    echo 'running with rhino'
    java -cp env-js.jar org.mozilla.javascript.tools.envjs.Main test.js;
fi

