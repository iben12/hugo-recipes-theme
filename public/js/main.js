(() => {
  // <stdin>
  function initializeRecipeSearch() {
    const input = document.querySelector("#recipe-search-input");
    const results = document.querySelector("#recipe-search-results");
    const status = document.querySelector("#recipe-search-status");
    const indexElement = document.querySelector("#recipe-search-index");
    const messagesElement = document.querySelector("#recipe-search-messages");
    if (!(input instanceof HTMLInputElement) || !(results instanceof HTMLElement) || !(status instanceof HTMLElement) || !(indexElement instanceof HTMLScriptElement) || !(messagesElement instanceof HTMLScriptElement)) {
      return;
    }
    const recipes = JSON.parse(indexElement.textContent || "[]");
    const messages = JSON.parse(messagesElement.textContent || "{}");
    function normalize(value) {
      return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    }
    function renderResults() {
      const query = input.value.trim();
      const tokens = normalize(query).split(/\s+/).filter(Boolean);
      const matches = tokens.length === 0 ? [] : recipes.filter((recipe) => {
        const searchableText = normalize([
          recipe.title,
          recipe.headline,
          recipe.author,
          ...recipe.categories,
          ...recipe.tags,
          ...recipe.ingredients
        ].join(" "));
        return tokens.every((token) => searchableText.includes(token));
      });
      results.replaceChildren();
      if (tokens.length === 0) {
        status.textContent = messages.prompt;
        return;
      }
      if (matches.length === 0) {
        status.textContent = messages.noResults.replace("{query}", query);
        return;
      }
      const resultMessage = matches.length === 1 ? messages.oneResult : messages.otherResults;
      status.textContent = resultMessage.replace("{count}", String(matches.length));
      for (const recipe of matches) {
        const article = document.createElement("article");
        article.className = "recipe-search-result";
        const link = document.createElement("a");
        link.className = "recipe-search-result__link";
        link.href = recipe.url;
        const categoryList = document.createElement("ul");
        categoryList.className = "recipe-categories";
        categoryList.setAttribute("aria-label", messages.categoryLabel);
        for (const category of recipe.categories) {
          const item = document.createElement("li");
          const label = document.createElement("span");
          label.className = "recipe-search-result__category";
          label.textContent = category;
          item.append(label);
          categoryList.append(item);
        }
        if (recipe.categories.length > 0) {
          link.append(categoryList);
        }
        const title = document.createElement("h2");
        title.textContent = recipe.title;
        link.append(title);
        if (recipe.headline) {
          const headline = document.createElement("p");
          headline.textContent = recipe.headline;
          link.append(headline);
        }
        if (recipe.author) {
          const author = document.createElement("p");
          author.className = "recipe-search-result__author";
          author.textContent = messages.byAuthor.replace("{author}", recipe.author);
          link.append(author);
        }
        article.append(link);
        results.append(article);
      }
    }
    input.value = new URLSearchParams(window.location.search).get("q") || "";
    input.addEventListener("input", () => {
      const url = new URL(window.location.href);
      if (input.value.trim()) {
        url.searchParams.set("q", input.value.trim());
      } else {
        url.searchParams.delete("q");
      }
      window.history.replaceState(null, "", url);
      renderResults();
    });
    renderResults();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeRecipeSearch);
  } else {
    initializeRecipeSearch();
  }
})();
//# sourceMappingURL=main.js.map
