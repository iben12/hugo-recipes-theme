# The Sunday Table

A Hugo cookbook theme for collecting and sharing recipes. It includes a recipe
homepage, recipe and category listings, individual recipe pages, and client-side
search.

## Requirements

- Hugo 0.146.0 or later
- Hugo Extended is not required by the current configuration

## Run locally

From the repository root, start the development server:

```sh
hugo server --source themes/recipes
```

Open <http://localhost:1313>. Hugo watches the theme content, layouts, assets,
and configuration while the server is running.

To build the site:

```sh
hugo --source themes/recipes
```

The generated site is written to `themes/recipes/public/` by default.

## Add a recipe

Create a page bundle under `themes/recipes/content/posts/`. For example:

```text
themes/recipes/content/posts/rosemary-focaccia/
├── index.md
└── cover.jpg
```

You can start a new recipe with Hugo's default archetype:

```sh
hugo new content posts/rosemary-focaccia/index.md --source themes/recipes
```

The archetype is at `themes/recipes/archetypes/default.md`. Edit the generated
front matter, add the recipe description below it, and replace the draft cover
image reference with your own image:

```toml
+++
title = 'Rosemary focaccia'
date = 2026-10-26
draft = false
headline = 'A soft, olive-oil-rich loaf with a crisp, herby crust.'
description = 'A simple, fragrant loaf to serve alongside soup or share warm from the oven.'
author = 'Your name'
categories = ['Baking', 'Vegetarian']
tags = ['weekend', 'bread']
prepTime = '20 minutes'
cookTime = '25 minutes'
servings = '8'
cover = 'cover.jpg'
coverAlt = 'Fresh rosemary focaccia on a wooden board'
ingredients = [
  '500 g bread flour',
  '7 g instant yeast',
  '400 ml warm water',
  '2 tbsp olive oil, plus more for the pan',
  '2 tsp fine salt',
  'A few sprigs of fresh rosemary',
  'Flaky salt, to finish',
]
+++

1. Mix the flour, yeast, and water until no dry patches remain. Cover and rest for 20 minutes.

{{< tip >}}
If the dough feels sticky, resist adding extra flour; the high hydration helps make the focaccia light and airy.
{{< /tip >}}

2. Add the fine salt and olive oil. Knead until smooth, then cover and let rise until doubled.

3. Oil a baking pan, transfer the dough, and gently stretch it to fit. Let it rise again.

4. Heat the oven to 220°C / 425°F. Dimple the dough, top with rosemary and flaky salt, and bake until golden.
```

The title, headline, categories, and cover appear on recipe cards. The recipe
page displays the author, optional timings and serving count, description,
ingredients, and preparation instructions.

### Recipe fields

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Recipe name |
| `headline` | Recommended | Short summary shown on cards and recipe pages |
| `author` | Recommended | Recipe author, shown as a byline |
| `categories` | Recommended | One or more category names, such as `Main dishes` or `Sweets` |
| `tags` | Optional | One or more descriptive tags, shown on recipe pages and included in search |
| `ingredients` | Recommended | Array of ingredient strings |
| `description` | Optional | Short introductory paragraph for the recipe page |
| `cover` | Optional | Cover image filename in the recipe page bundle; defaults to `cover.jpg` |
| `coverAlt` | Optional | Accessible alternative text for the cover image |
| `prepTime` | Optional | Preparation time |
| `cookTime` | Optional | Cooking time |
| `servings` | Optional | Number of portions |

Recipes without a cover image display a styled placeholder on listing cards.
Categories are generated from recipe `categories` fields using Hugo's
`categories` taxonomy. Recipe `tags` link to their tag pages and are searchable
alongside titles, categories, and ingredients.

Preparation instructions are written as a numbered Markdown list in the recipe
body. Add a `tip` shortcode between any two steps to show a highlighted note at
that point:

```md
1. Roast the vegetables until tender.

{{< tip >}}
Cut the vegetables into similar-sized pieces so they cook evenly.
{{< /tip >}}

2. Toss with the herbs and serve warm.
```

The tip label is localized through the `tip` entry in the language
catalogs.

## Search

The Search page is available from the main navigation at `/search/`. It searches
recipe titles, headlines, author names, categories, tags, and ingredients. Hugo
embeds a small index in the generated page; search runs in the browser and
doesn't require an external service.

## Languages and translations

Hungarian (`hu`) is currently the default content language in
`themes/recipes/hugo.toml`. The English and Hungarian interface catalogs are
`themes/recipes/i18n/en.toml` and `themes/recipes/i18n/hu.toml`. Theme interface
labels use Hugo's `T` translation function.

To add or update interface translations, keep the same translation keys in
each language catalog. Translations apply to theme interface labels; recipe
titles, descriptions, ingredients, steps, and category names come from the
content files and should be translated in the recipe content itself.

## Project structure

```text
themes/recipes/
├── archetypes/   # New content templates
├── assets/       # CSS and JavaScript
├── content/      # Homepage, recipes, and search page content
├── i18n/         # English and Hungarian interface translations
├── layouts/      # Hugo page layouts and partials
├── static/       # Static files such as the favicon
└── hugo.toml     # Site and language configuration
```
