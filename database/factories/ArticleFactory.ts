const Factory = require('./Factory');

class ArticleFactory extends Factory {
  get model() {
    return 'api::article.article';
  }

  definition() {
    return {
      title: this.faker.lorem.sentence(),
      slug: this.faker.helpers.slugify(this.faker.lorem.sentence()).toLowerCase(),
      content: this.faker.lorem.paragraphs(5),
      description: this.faker.lorem.paragraph(),
      publishedAt: this.faker.date.past(),
    };
  }

  /**
   * State: Draft article
   */
  draft() {
    return {
      publishedAt: null,
    };
  }

  /**
   * State: Featured article
   */
  featured() {
    return {
      featured: true,
    };
  }

  /**
   * State: Future publication
   */
  scheduled() {
    return {
      publishedAt: this.faker.date.future(),
    };
  }
}

module.exports = ArticleFactory;
