const fs = require('fs');
const path = require('path');

/**
 * Load all factories and make them available
 * @param {Object} strapi - Strapi instance
 * @returns {Object} Object containing all factory instances
 */
function loadFactories(strapi) {
  const factoriesPath = __dirname;
  const factories = {};

  const files = fs.readdirSync(factoriesPath)
    .filter(file => 
      file.endsWith('Factory.js') && 
      file !== 'Factory.js' && 
      file !== 'index.js'
    );

  files.forEach(file => {
    const FactoryClass = require(path.join(factoriesPath, file));
    const factoryName = file.replace('.js', '');
    
    // Create instance and make it available
    factories[factoryName] = new FactoryClass(strapi);
  });

  return factories;
}

module.exports = loadFactories;
