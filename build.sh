#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

rm -rf build
mkdir build

echo "var jpeg = jpeg || {};" > build/lossless.js
echo "jpeg.lossless = jpeg.lossless || {};" >> build/lossless.js

FILES=src/*.js
for f in $FILES
do
  cat $f | sed '/Imports/,/Constructor/d' | sed '/Exports/,//d' >> build/lossless.js
done

echo "var moduleType = typeof module;" >> build/lossless.js
echo "if ((moduleType !== 'undefined') && module.exports) {" >> build/lossless.js
echo "   module.exports = jpeg;" >> build/lossless.js
echo "}" >> build/lossless.js

echo "Done!"