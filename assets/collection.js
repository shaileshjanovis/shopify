(function () {
  let filteredProducts,
    filterButton,
    filterCloseButton,
    filterAccordionButton,
    filterOptions,
    filterApplyButton,
    filterResetButton,
    filterContainer,
    sortButton,
    sortOptions,
    sortOptionDesktop,
    sortContainer;
  const filterBar = document.querySelector('.filter-bar');
  const quickViewButton = document.querySelectorAll('.quick-view button');
  const qvcNewsletter = document.querySelector('#qvc_newsletter_email');

  quickViewButton.forEach((button) => {
    button.addEventListener('click', displayQuickViewModal);
  });

  if (qvcNewsletter) qvcNewsletter.addEventListener('input', (e) => {
    const submitButton = document.querySelector('#contact_form button[type="submit"]');
    if (e.target.value) {
      submitButton.disabled = false;
    } else {
      submitButton.disabled = true;
    }
  });

  if (filterBar) {
    filterContainer = document.querySelector('.filter-container');
    filterButton = document.querySelector('.filter-bar .filter');
    filterCloseButton = filterContainer.querySelector('.header button');
    filterAccordionButton = filterContainer.querySelectorAll('.accordion-btn');
    filterOptions = filterContainer.querySelectorAll('input[type="checkbox"]');
    filterApplyButton = filterContainer.querySelector('button.apply');
    filterResetButton = filterContainer.querySelector('button.reset');
    sortContainer = document.querySelector('.filter-bar .sort-container');
    sortButton = document.querySelector('.filter-bar .sort');
    sortOptions = filterContainer.querySelectorAll('input[type="radio"]');
    sortOptionDesktop = sortContainer.querySelectorAll('li');

    // ========== Attach event listeners ========== //
    filterButton.addEventListener('click', openFilterContainer);
    filterCloseButton.addEventListener('click', closeFilterContainer);
    filterAccordionButton.forEach((button) => {
      button.addEventListener('click', openFilterAccordion);
    });
    filterOptions.forEach((option) => {
      option.addEventListener('change', applyFilter);
    });
    filterApplyButton.addEventListener('click', closeFilterContainer);
    filterResetButton.addEventListener('click', resetFilter);
    sortButton.addEventListener('click', openSortContainer);
    sortOptions.forEach((option) => {
      option.addEventListener('change', changeSortOption);
    });
    sortOptionDesktop.forEach((option) => {
      option.addEventListener('click', changeSortOptionDesktop);
    });
  }

  // ========== Methods ========== //
  /**
   *
   */
  function swapHeroImage(e) {
    let selectedImg = e.target;
    const imgSrc = e.target.dataset.src;

    while (!selectedImg.classList.contains('hero-carousel')) {
      selectedImg = selectedImg.parentElement;
    }

    selectedImg = selectedImg.previousElementSibling;
    selectedImg.src = imgSrc;
  }

  /**
   *
   */
  function changeModalVariant(modal, variantId) {
    const productName = modal.querySelector('.hero-desc--container h1').innerText;
    const images = document.querySelector(`#modal-img-${variantId}`).value.split('|');
    const summary = document.querySelector(`#modal-summary-${variantId}`).value;

    // Update variant selector selected value
    const selectedIdOptions = modal.querySelector('form select[name="id"]').options;
    const optionSize = selectedIdOptions.length;
    let selectedVariant;

    for (let i = 0; i < optionSize; i++) {
      if (selectedIdOptions[i].value === variantId) {
        selectedIdOptions[i].selected = true;
        selectedVariant = selectedIdOptions[i].innerText;
      }
    }

    const color = modal.querySelector('.variant-selector.color');
    if (color) {
      const colorOptions = color.querySelectorAll('.options-container div');
      color.querySelector('h6 span').innerText = selectedVariant;

      colorOptions.forEach((el) => {
        if (el.dataset.value === selectedVariant) {
          el.classList.add('selected');
        } else el.classList.remove('selected');
      });
    }

    const size = modal.querySelector('.variant-selector.size');
    if (size) {
      size.querySelector('.dropdown .value').innerText = selectedVariant;
    }

    // Update images
    modal.querySelector('.hero-selected-img').src = images[0];

    const thumbnailContainer = modal.querySelector('.hero-carousel');
    while (thumbnailContainer.firstChild) {
      thumbnailContainer.removeChild(thumbnailContainer.firstChild);
    }

    images.forEach((image, index) => {
      const img = document.createElement('img');
      img.setAttribute('src', `//images.accentuate.io?c_options=w_132&image=${image}`);
      img.setAttribute('data-src', image);
      img.setAttribute('alt', `${productName} thumbnail ${index}`);

      thumbnailContainer.appendChild(img);
    });

    // Update summary
    modal.querySelector('.hero-desc--container .summary').innerText = summary;

    // Re-attach event listener for newly added elements
    const thumbnails = modal.querySelectorAll('.hero-carousel img');

    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener('click', swapHeroImage);
    });
  }

  /**
   * Display product quick view modal
   */
  function displayQuickViewModal(e) {
    e.preventDefault();

    let target = e.target;
    while (!target.classList.contains('quick-view')) {
      target = target.parentElement;
    }

    const productId = target.dataset.productid;
    const variantId = target.dataset.variantid;
    const modal = document.getElementById(`quick-view-${productId}`);
    changeModalVariant(modal, variantId);

    modal.style.display = 'flex';
  }

  /**
   * Open filter drop-down container
   */
  function openFilterContainer() {
    const panelHeight = filterContainer.style.maxHeight;

    if (window.matchMedia(`(min-width: 768px)`).matches) {
      if (!panelHeight || panelHeight === '0px') {
        closeSortContainer();
        filterButton.classList.add('opened');
        filterContainer.style.maxHeight = filterContainer.scrollHeight + 'px';
      } else {
        closeFilterContainer();
      }
    } else {
      filterContainer.classList.add('opened');
    }
  }

  /**
   * Close filter drop-down container
   */
  function closeFilterContainer() {
    if (window.matchMedia(`(min-width: 768px)`).matches) {
      filterButton.classList.remove('opened');
      filterContainer.style.maxHeight = '0px';
    } else {
      filterContainer.classList.remove('opened');
    }
  }

  /**
   * Open sort by drop-down container
   */
  function openSortContainer() {
    const panelHeight = sortContainer.style.maxHeight;

    if (!panelHeight || panelHeight === '0px') {
      closeFilterContainer();
      sortButton.classList.add('opened');
      sortContainer.style.maxHeight = sortContainer.scrollHeight + 'px';
    } else {
      closeSortContainer();
    }
  }

  /**
   * Close sort by drop-down container
   */
  function closeSortContainer() {
    sortButton.classList.remove('opened');
    sortContainer.style.maxHeight = '0px';
  }

  /**
   * Handle sort by option change on mobile
   */
  function changeSortOption(e) {
    const parent = e.target.parentElement;
    const subtitle = filterContainer.querySelector('.sort-options .accordion-btn p');
    subtitle.innerText = parent.querySelector('label').innerText;

    renderProductCatalog();
  }

  /**
   * Handle sort by option change on desktop
   */
  function changeSortOptionDesktop(e) {
    const target = e.target;
    let parent = target.parentElement;

    parent.querySelectorAll('li').forEach((li) => li.classList.remove('active'));
    target.classList.add('active');
    document.getElementById(target.dataset.id).checked = true;

    while (!parent.classList.contains('button')) {
      parent = parent.parentElement;
    }

    parent.querySelector('span').innerText = `Sort By: ${target.innerText}`;

    renderProductCatalog();
  }

  /**
   * Open filter accordion on mobile
   */
  function openFilterAccordion(e) {
    let target = e.target;

    while (!target.classList.contains('accordion-btn')) {
      target = target.parentElement;
    }

    const sibling = target.nextElementSibling;
    if (!target.classList.contains('expanded')) {
      target.classList.add('expanded');
      sibling.style.maxHeight = sibling.scrollHeight + 'px';
    } else {
      target.classList.remove('expanded');
      sibling.style.maxHeight = '0px';
    }
  }

  /**
   * Reset all option to default
   *
   * Needs: All
   * Skin Types: All
   * Ingredients: All
   * Sort By: Featured
   */
  function resetFilter() {
    filteredProducts = products;

    document.getElementById('sort-featured').checked = true;
    document.querySelectorAll('.filter-bar .sort.button li').forEach((li, index) => {
      if (index === 0) {
        li.classList.add('active');
      } else {
        li.classList.remove('active');
      }
    });

    filterOptions.forEach((option) => {
      if (option.value === 'All') option.checked = true;
      else option.checked = false;
    });

    filterContainer.querySelector('.need .accordion-btn p').innerText = 'All Needs';
    filterContainer.querySelector('.skin-type .accordion-btn p').innerText = 'All Concerns';
    filterContainer.querySelector('.ingredient .accordion-btn p').innerText = 'All Ingredients';
    filterContainer.querySelector('.sort-options .accordion-btn p').innerText = 'Featured';
    document.querySelector('.filter-bar .sort.button span').innerText = 'Sort By: Featured';

    updateSelectedFilterCount();
    renderProductCatalog();
    closeFilterContainer();
  }

  /**
   * Handle filter change
   */
  function applyFilter(e) {
    const target = e.target;

    if (!target.id.includes('all')) {
      document.getElementById(`${target.name}-all`).checked = false;
    } else {
      const inputs = filterContainer.querySelectorAll(`input[name="${target.name}"]`);
      inputs.forEach((el) => {
        if (!el.id.includes('all')) el.checked = false;
      });
    }

    // reselect 'all' when no filters selected
    if (
      filterContainer.querySelectorAll('input[name="needs"]:checked').length < 1 ||
      filterContainer.querySelectorAll('input[name="skin-types"]:checked').length < 1 ||
      filterContainer.querySelectorAll('input[name="ingredients"]:checked').length < 1
    ) {
      document.getElementById(`${target.name}-all`).checked = true;
    }

    const needs = filterContainer.querySelectorAll('input[name="needs"]:checked');
    const skinTypes = filterContainer.querySelectorAll('input[name="skin-types"]:checked');
    const ingredients = filterContainer.querySelectorAll('input[name="ingredients"]:checked');

    if (target.name === 'needs') {
      const subtitle = filterContainer.querySelector('.need .accordion-btn p');
      subtitle.innerText = updateFilterSubtitle(needs, 'All Needs');
    } else if (target.name === 'skin-types') {
      const subtitle = filterContainer.querySelector('.skin-type .accordion-btn p');
      subtitle.innerText = updateFilterSubtitle(skinTypes, 'All Concerns');
    } else if (target.name === 'ingredients') {
      const subtitle = filterContainer.querySelector('.ingredient .accordion-btn p');
      subtitle.innerText = updateFilterSubtitle(ingredients, 'All Ingredients');
    }

    filteredProducts = products.filter((product) => {
      let isMatch = false;

      needs.forEach((need) => {
        if (product.tag.includes(need.value) || need.value === 'All') {
          skinTypes.forEach((type) => {
            if (product.tag.includes(type.value) || type.value === 'All') {
              ingredients.forEach((ingredient) => {
                if (product.tag.includes(ingredient.value) || ingredient.value === 'All') {
                  isMatch = true;
                }
              });
            }
          });
        }
      });

      return isMatch;
    });

    updateSelectedFilterCount();
    renderProductCatalog();
  }

  /**
   * Update filter subtitle
   */
  function updateFilterSubtitle(filter, allMsg) {
    let s = '';

    for (const [index, el] of filter.entries()) {
      if (el.value === 'All') {
        s = allMsg;
      } else if (index < 3) {
        s += `${s.length > 0 ? ', ' : ''}${el.value}`;
      } else {
        s += `, and (${filter.length - 3}) more`;
        break;
      }
    }

    return s;
  }

  /**
   * Update selected filter count
   */
  function updateSelectedFilterCount() {
    const selectedOptions = filterContainer.querySelectorAll('input[type="checkbox"]:checked');
    let count = 0;

    selectedOptions.forEach((option) => {
      if (option.value !== 'All') count++;
    });

    const el = document.querySelector('.filter-bar .filter.button');

    if (count > 0) {
      el.innerHTML = `${count} Filter${count > 1 ? 's' : ''} Selected`;
    } else if (count === 0) {
      el.innerHTML = 'Filter <span>By</span>';
    }
  }

  /**
   * Render product catalog on selected option
   */
  function renderProductCatalog() {
    let displayBanner = true;
    let noTopGrid = false;
    const sortBy = filterContainer.querySelector('input[name="sort-by"]:checked').value;
    const selectedOptions = filterContainer.querySelectorAll('input[type="checkbox"]:checked');

    for (const option of selectedOptions) {
      if (option.value !== 'All') {
        displayBanner = false;
        break;
      }
    }

    // Remove all items from grid
    const sections = document.querySelectorAll('#plp-grid > section.category');
    sections.forEach((section) => {
      section.classList.add('empty');

      const subCategories = section.querySelectorAll('.sub-category');
      subCategories.forEach((category) => {
        category.classList.add('empty');

        const grid = category.querySelector('.product-container');
        while (grid.firstChild) {
          grid.removeChild(grid.firstChild);
        }
      });
    });

    // Sort products
    if (sortBy.includes('Price')) {
      if (sortBy === 'Price Ascending') {
        filteredProducts.sort((a, b) => parseFloat(a.priceStr) - parseFloat(b.priceStr));
      } else if (sortBy === 'Price Descending') {
        filteredProducts.sort((a, b) => parseFloat(b.priceStr) - parseFloat(a.priceStr));
      }
    }

    // Add filtered items
    filteredProducts.forEach((product) => {
      let itemLimit;
      let sectionId;
      let banner;

      if (!sortBy.includes('Price')) {
        sectionId = `${product.category}-${product.subCategory}`;
        banner = collectionBanners.find((banner) => banner.id === sectionId);
      } else {
        sectionId = 'sort-by-price-grid';
      }

      const el = document.getElementById(sectionId);
      // Only some subcategotories are shown on some page (e.g., Navigation are shown on All); skip those not found
      if (!el) {
        return;
      }
      const grid = el.querySelector('.product-container');

      el.classList.remove('empty');
      el.parentElement.classList.remove('empty');

      // Limit number of item per grid if there is banner
      if (currentCollectionType === 'Sub Category' || sortBy.includes('Price')) {
        noTopGrid = true;
        itemLimit = -1;
      } else if (banner) {
        if (banner.hasOwnProperty('banner_1x1')) {
          itemLimit = 5;
        } else if (banner.hasOwnProperty('banner_1x2')) {
          itemLimit = 4;
        }
      } else {
        itemLimit = 6;
      }

      // Render item
      if (itemLimit < 0 || grid.childElementCount < itemLimit) {
        const a = document.createElement('a');
        a.setAttribute('id', `item-${product.id}`);
        a.setAttribute('href', product.url);
        a.setAttribute('class', `product-item grid-border${noTopGrid ? ' no-top' : ''}`);

        a.innerHTML = `
          <div class="thumbnail">
            <picture>
              <source
                media="(min-width: 768px)"
                srcset="${product.thumbnail}"
              />
              <source
                media="(max-width: 767.98px)"
                srcset="//images.accentuate.io?c_options=w_343&image=${product.thumbnail} 1x,
                        //images.accentuate.io?c_options=w_686&image=${product.thumbnail} 2x"
              />
        
              <img src="${product.thumbnail}" alt="${product.variantTitle}">
            </picture>
        
            <div
              class="quick-view"
              data-productid="${product.productId}"
              data-variantid="${product.id}"
            >
              ${
                product.isAvailable === 'true'
                  ? '<button type="button">Quick View</button>'
                  : '<button type="button" disabled>Out of stock</button>'
              }
            </div>
          </div>

          <div class="rating">
            ${
              product.review.hasOwnProperty('average_score')
                ? `<div class="star">
                <span>${product.review.average_score}</span>
              </div>

              <div class="review-count">
                ${product.review.total_reviews} Review${product.review.total_reviews > 1 ? 's' : ''}
              </div>`
                : ``
            }
          </div>

          <h4>${product.productTitle}</h4>

          ${
            product.ingredientSize > 0
              ? `<h5>${product.variantTitle} (${product.ingredientSize} colors available)</h5>`
              : product.colorSize > 0
              ? `<h5>${product.variantTitle} (${product.colorSize} colors available)</h5>`
              : product.volumeSize > 0
              ? `<h5>${product.variantTitle} (${product.volumeSize} sizes available)</h5>`
              : product.scentSize > 0
              ? `<h5>${product.variantTitle} (${product.scentSize} scents available)</h5>`
              : ``
          }

          <div class="price">
            ${
              product.comparePrice
                ? `<span class="visually-hidden">Regular Price</span>
                  <s>${product.comparePrice}</s>
                  <span class="visually-hidden">Sale price</span>
                  <span class="sale">${product.price}</span>`
                : `<span>${product.price}</span>`
            }
          </div>
        `;

        a.querySelector('.quick-view button').addEventListener('click', displayQuickViewModal);

        grid.appendChild(a);
      }
    });

    // Display banners
    if (displayBanner && !sortBy.includes('Price')) {
      collectionBanners.forEach((banner) => {
        const el = document.querySelector(`#${banner.id} .product-container`);
        const bannerEl = document.createElement('div');

        if (banner.hasOwnProperty('banner_1x1')) {
          bannerEl.setAttribute('class', 'banner-1x1 grid-border');
          bannerEl.innerHTML = `
              <h6>${banner.banner_1x1.title}</h6>
              <p>${banner.banner_1x1.body}</p>
              <a href="${banner.banner_1x1.button_link}">
                ${banner.banner_1x1.button_label}
              </a>
            `;

          if (el.childElementCount < 4) {
            el.appendChild(bannerEl);
          } else {
            const targetEl = el.querySelectorAll('a')[3];
            el.insertBefore(bannerEl, targetEl);
          }
        } else if (banner.hasOwnProperty('banner_1x2')) {
          bannerEl.setAttribute('class', 'banner-1x2 grid-border');
          bannerEl.innerHTML = `
              <figure>
                <img src="${banner.banner_1x2.image}" alt="">
                <figcaption>${banner.banner_1x2.caption}</figcaption>
              </figure>
            `;

          el.appendChild(bannerEl);
        }
      });
    }

    // Show "No results" if no results
    const noResultsSection = document.getElementById('no-results');
    if (filteredProducts.length === 0) {
      noResultsSection.removeAttribute('hidden');
    } else {
      noResultsSection.setAttribute('hidden', '');
    }
  }

})();
