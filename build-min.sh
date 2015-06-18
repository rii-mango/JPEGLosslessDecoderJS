#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

rm -rf build
mkdir build

cat LICENSE > build/lossless-min.js

echo "var jpeg = jpeg || {};" >> build/lossless-min.js
echo "jpeg.lossless = jpeg.lossless || {};" >> build/lossless-min.js

FILES=src/*.js
for f in $FILES
do
  cat $f | sed '/Imports/,/Constructor/d' | sed '/Exports/,//d' > build/file0.js
  java -jar lib/yuicompressor-2.4.7.jar build/file0.js -o build/file.js
  cat build/file.js >> build/lossless-min.js
  rm build/file.js
  rm build/file0.js
done

echo "var moduleType = typeof module;" >> build/lossless-min.js
echo "if ((moduleType !== 'undefined') && module.exports) {" >> build/lossless-min.js
echo "   module.exports = jpeg;" >> build/lossless-min.js
echo "}" >> build/lossless-min.js

echo "Done!"