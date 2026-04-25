const Seeder = require('./Seeder');

class ArticleSeeder extends Seeder {
  async run() {
    this.log('Seeding articles...');

    // Get all users to assign as authors
    const users = await this.strapi.entityService.findMany(
      'plugin::users-permissions.user',
      { limit: 100 }
    );

    if (users.length === 0) {
      this.log('No users found. Skipping article seeding.');
      return;
    }

    // Create 20 published articles
    const publishedArticles = await this.factory('ArticleFactory')
      .createMany(20);
    this.log(`Created ${publishedArticles.length} published articles`);

    // Create 5 draft articles
    const draftArticles = await this.factory('ArticleFactory')
      .state('draft')
      .createMany(5);
    this.log(`Created ${draftArticles.length} draft articles`);

    // Create 3 featured articles
    const featuredArticles = await this.factory('ArticleFactory')
      .state('featured')
      .createMany(3);
    this.log(`Created ${featuredArticles.length} featured articles`);

    // Create a custom article
    const customArticle = await this.factory('ArticleFactory').create({
      title: 'Welcome to Our Blog',
      slug: 'welcome-to-our-blog',
      content: 'This is a custom welcome article with specific content.',
    });
    this.log(`Created custom article: ${customArticle.title}`);
  }
}

module.exports = ArticleSeeder;
