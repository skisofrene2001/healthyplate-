const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const IMAGES = {
  'poulet': 'photo-1604503468506-a8da13d82791',
  'viande': 'photo-1588168333986-5078d3ae3976',
  'oeuf': 'photo-1582722872445-44dc5f7e3c8f',
  'thon': 'photo-1546069901-ba9599a7e63c',
  'sardine': 'photo-1534604973900-c43ab4c2e0ab',
  'crevette': 'photo-1709146097755-f5f9ba107de8',
  'lentille': 'photo-1546549032-9571cd6b27df',
  'pois_chiche': 'photo-1585937421612-70a008356fbe',
  'haricot': 'photo-1551462147-ff29053bfc14',
  'lait': 'photo-1563636619-e9143da7973b',
  'yaourt': 'photo-1488477181946-6428a0291777',
  'fromage': 'photo-1691939610797-aba18030c15f',
  'beurre': 'photo-1589985270826-4b7bb135bc9d',
  'tomate': 'photo-1546094096-0df4bcaaa337',
  'oignon': 'photo-1724256031338-b5bfba816cfd',
  'pdt': 'photo-1724256031338-b5bfba816cfd',
  'carotte': 'photo-1447175008436-054170c2e979',
  'courgette': 'photo-1664551734439-cf4bc8dd0d9f',
  'poivron': 'photo-1563565375-f3fdfdbefa83',
  'epinard': 'photo-1576045057995-568f588f82fb',
  'concombre': 'photo-1449300079323-02e209d9d3a6',
  'laitue': 'photo-1701964643904-ed5788b634d8',
  'ail': 'photo-1675731118551-79b3da05a5d4',
  'avocat': 'photo-1523049673857-eb18f1d7b578',
  'banane': 'photo-1571771894821-ce9b6c11b08e',
  'pomme': 'photo-1568702846914-96b305d2aaeb',
  'orange': 'photo-1675237625695-710b9a6c3f2e',
  'citron': 'photo-1590502593747-42a996133562',
  'fraise': 'photo-1724256149016-05c013fe058e',
  'datte': 'photo-1676208753932-6e8bc83a0b0d',
  'pain': 'photo-1509440159596-0249088772ff',
  'riz': 'photo-1516684732162-798a0062be99',
  'pate': 'photo-1621996346565-e3dbc646d9a9',
  'semoule': 'photo-1585937421612-70a008356fbe',
  'flocon': 'photo-1517673400267-0251440c45dc',
  'farine': 'photo-1574323347407-f5e1ad6d020b',
  'huile': 'photo-1474979266404-7eaacbcd87c5',
  'olive': 'photo-1474979266404-7eaacbcd87c5',
  'miel': 'photo-1587049352846-4a222e784d38',
  'sucre': 'photo-1672349888046-361807de476f',
  'cumin': 'photo-1596040033229-a9821ebd058d',
  'paprika': 'photo-1596040033229-a9821ebd058d',
  'curcuma': 'photo-1596040033229-a9821ebd058d',
  'cannelle': 'photo-1596040033229-a9821ebd058d',
  'persil': 'photo-1726862972631-00709ba547b0',
  'coriandre': 'photo-1726862972631-00709ba547b0',
  'sel': 'photo-1672349888046-361807de476f',
  'poivre': 'photo-1596040033229-a9821ebd058d',
  'proteines': 'photo-1604503468506-a8da13d82791',
  'laitiers': 'photo-1563636619-e9143da7973b',
  'legumes': 'photo-1540420773420-3366772f4999',
  'fruits': 'photo-1676064229122-a5d5fb0c11ed',
  'cereales': 'photo-1509440159596-0249088772ff',
  'huiles': 'photo-1474979266404-7eaacbcd87c5',
  'sucrants': 'photo-1587049352846-4a222e784d38',
  'epices': 'photo-1596040033229-a9821ebd058d',
};

const OUTPUT_DIR = path.join(__dirname, '../frontend/public/images');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let downloaded = 0;
const total = Object.keys(IMAGES).length;

function downloadImage(name, photoId) {
  const url = `https://images.unsplash.com/${photoId}?w=400&h=400&fit=crop&auto=format&q=80`;
  const filename = path.join(OUTPUT_DIR, `${name}.jpg`);
  
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          downloaded++;
          console.log(`[${downloaded}/${total}] Downloaded: ${name}.jpg`);
          resolve();
        });
      } else {
        console.log(`Failed: ${name} (${response.statusCode})`);
        file.close();
        fs.unlinkSync(filename);
        resolve();
      }
    }).on('error', (err) => {
      console.log(`Error: ${name} - ${err.message}`);
      file.close();
      if (fs.existsSync(filename)) fs.unlinkSync(filename);
      resolve();
    });
  });
}

async function main() {
  console.log('Downloading ingredient images from Unsplash...\n');
  const names = Object.keys(IMAGES);
  for (const name of names) {
    await downloadImage(name, IMAGES[name]);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\nDone! Downloaded ${downloaded} images to ${OUTPUT_DIR}`);
}

main();
