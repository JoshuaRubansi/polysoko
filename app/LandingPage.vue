<script setup lang="ts">
type Category = 'All finds' | 'Home & living' | 'Fashion' | 'Electronics' | 'Art & craft' | 'Food & drink'
type User = { id: string, name: string, email: string, role: 'user' | 'admin' }
type Listing = {
  id: string
  name: string
  category: Exclude<Category, 'All finds'>
  price: number
  location: string
  seller: string
  images: string[]
  stock: number
  badge?: string
}

const props = defineProps<{ user: User | null }>()
const emit = defineEmits<{
  'sign-in': []
  'sign-out': []
  'admin-view': []
}>()
const categories: Category[] = ['All finds', 'Home & living', 'Fashion', 'Electronics', 'Art & craft', 'Food & drink']
const selectedCategory = ref<Category>('All finds')
const searchQuery = ref('')
const savedListings = ref<string[]>([])
const cartItems = ref<(Listing & { quantity: number })[]>([])
const cartOpen = ref(false)
const cartLoading = ref(false)
const checkoutLoading = ref(false)
const pageMessage = ref('')
const pageMessageType = ref<'success' | 'error'>('success')
const selectedListing = ref<Listing | null>(null)
const selectedPhotoIndex = ref(0)
const listings = ref<Listing[]>([])
const cartTotal = computed(() => cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
const cartCount = computed(() => cartItems.value.reduce((sum, item) => sum + item.quantity, 0))

async function loadListings() {
  try {
    const response = await $fetch<{ products: Listing[] }>('/api/products')
    listings.value = response.products
  } catch {
    pageMessage.value = 'We could not load items. Please refresh the page to try again.'
    pageMessageType.value = 'error'
  }
}

async function loadCart() {
  if (!props.user) {
    cartItems.value = []
    return
  }

  cartLoading.value = true
  try {
    const response = await $fetch<{ items: (Listing & { quantity: number })[] }>('/api/cart')
    cartItems.value = response.items
  } catch {
    pageMessage.value = 'We could not load your cart. Please try again.'
    pageMessageType.value = 'error'
  } finally {
    cartLoading.value = false
  }
}

onMounted(() => {
  void loadListings()
  void loadCart()
})

watch(() => props.user, () => {
  void loadCart()
})

const filteredListings = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return listings.value.filter((listing) => {
    const matchesCategory = selectedCategory.value === 'All finds' || listing.category === selectedCategory.value
    const matchesQuery = !query || [listing.name, listing.category, listing.location, listing.seller]
      .some(value => value.toLocaleLowerCase().includes(query))
    return matchesCategory && matchesQuery
  })
})

function toggleSaved(id: string) {
  savedListings.value = savedListings.value.includes(id)
    ? savedListings.value.filter(savedId => savedId !== id)
    : [...savedListings.value, id]
}

async function addToCart(listing: Listing) {
  if (!props.user) {
    emit('sign-in')
    return
  }

  try {
    await $fetch('/api/cart/items', { method: 'POST', body: { productId: listing.id } })
    await loadCart()
    pageMessage.value = `${listing.name} added to your cart.`
    pageMessageType.value = 'success'
  } catch (error: unknown) {
    pageMessage.value = getErrorMessage(error, 'We could not add this item to your cart.')
    pageMessageType.value = 'error'
  }
}

async function removeFromCart(productId: string | number) {
  try {
    await $fetch(`/api/cart/items/${productId}`, { method: 'DELETE' })
    await loadCart()
  } catch (error: unknown) {
    pageMessage.value = getErrorMessage(error, 'We could not remove this item from your cart.')
    pageMessageType.value = 'error'
  }
}

async function checkout() {
  checkoutLoading.value = true
  try {
    const order = await $fetch<{ orderId: string, total: number }>('/api/checkout', { method: 'POST' })
    pageMessage.value = `Order ${order.orderId.slice(0, 8)} placed for KSh ${order.total.toLocaleString('en-KE')}. Demo checkout does not charge real money.`
    pageMessageType.value = 'success'
    cartOpen.value = false
    await Promise.all([loadCart(), loadListings()])
  } catch (error: unknown) {
    pageMessage.value = getErrorMessage(error, 'We could not place your order. Please try again.')
    pageMessageType.value = 'error'
  } finally {
    checkoutLoading.value = false
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data !== null && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }
  return fallback
}

function openListing(listing: Listing) {
  selectedListing.value = listing
  selectedPhotoIndex.value = 0
}

function closeListing() {
  selectedListing.value = null
}

function showListingPhoto(index: number) {
  if (!selectedListing.value) return
  const photoCount = selectedListing.value.images.length
  selectedPhotoIndex.value = (index + photoCount) % photoCount
}

</script>

<template>
  <main class="marketplace">
    <div class="announcement-bar">
      <span>A good find is closer than you think.</span>
      <span class="announcement-location">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16 8.3c0 4.1-6 9-6 9s-6-4.9-6-9a6 6 0 1 1 12 0Z" stroke="currentColor" stroke-width="1.5" /><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.5" /></svg>
        Nairobi, Kenya
      </span>
    </div>

    <header class="site-header">
      <a class="brand" href="/" aria-label="Polysoko home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none"><path d="M5 10.5h22l-2 17H7l-2-17Z" fill="currentColor" /><path d="M11 12V8a5 5 0 0 1 10 0v4" stroke="#174E3B" stroke-width="2.4" stroke-linecap="round" /><path d="m12 19 2.7 2.7 5.6-5.8" stroke="#174E3B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
        <span>polysoko<span class="brand-period">.</span></span>
      </a>
      <nav class="header-links" aria-label="Main navigation">
        <a class="active-link" href="#discover">Discover</a>
        <a href="#discover" @click="selectedCategory = 'Art & craft'">Made nearby</a>
        <a href="#story">Our story</a>
      </nav>
      <div class="header-actions">
        <button v-if="user?.role === 'admin'" class="sell-link" type="button" @click="emit('admin-view')">Admin dashboard</button>
        <button v-if="user" class="cart-button" type="button" @click="cartOpen = true">
          Cart <span class="cart-count">{{ cartCount }}</span>
        </button>
        <span v-if="user" class="account-name">{{ user.name }}</span>
        <button v-if="user" class="sign-in-button" type="button" @click="emit('sign-out')">Log out</button>
        <button v-else class="sign-in-button" type="button" @click="emit('sign-in')">Sign in <span aria-hidden="true">↗</span></button>
      </div>
    </header>

    <p v-if="pageMessage" class="page-message" :class="`page-message-${pageMessageType}`" role="status" aria-live="polite">{{ pageMessage }}</p>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <span class="hero-eyebrow"><span class="eyebrow-line" /> A LITTLE MORE LOCAL</span>
        <h1 id="hero-title">Find your kind<br>of <span>good.</span></h1>
        <p>Lovely things, made and found by people just around the corner. Go on, have a look.</p>
        <a class="hero-cta" href="#discover">Explore the good stuff
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </a>
        <div class="hero-note">
          <span class="avatar-stack" aria-hidden="true"><i>W</i><i>N</i><i>A</i></span>
          <span>Good finds from good people, <strong>right here in Nairobi.</strong></span>
        </div>
      </div>
      <div class="hero-art" aria-label="A curated collection of locally made goods">
        <div class="hero-art-backdrop" />
        <div class="hero-sticker">GOOD<br>THINGS<br>GROW HERE<span>✳</span></div>
        <div class="hero-photo hero-photo-main">
          <img src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1100&q=85" alt="Handcrafted homewares in a bright, welcoming space">
        </div>
        <div class="hero-photo hero-photo-small">
          <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=500&q=85" alt="Thoughtfully chosen everyday fashion">
        </div>
        <span class="hero-scribble">made with care <span>↗</span></span>
      </div>
    </section>

    <section id="discover" class="discover-section" aria-labelledby="discover-title">
      <div class="section-topline">
        <div>
          <span class="section-eyebrow">THE GOOD STUFF</span>
          <h2 id="discover-title">A little something <em>for you.</em></h2>
        </div>
        <label class="search-box">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.6" /><path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
          <input v-model="searchQuery" type="search" placeholder="What are you looking for?" aria-label="Search listings">
          <kbd>/</kbd>
        </label>
      </div>

      <div class="discovery-controls">
        <div class="category-list" role="group" aria-label="Filter by category">
          <button v-for="category in categories" :key="category" type="button" :class="{ 'category-active': selectedCategory === category }" :aria-pressed="selectedCategory === category" @click="selectedCategory = category">
            {{ category }}
          </button>
        </div>
        <span class="results-count">{{ filteredListings.length }} lovely finds</span>
      </div>

      <p v-if="!listings.length" class="catalog-loading">Loading the good finds…</p>
      <div v-if="filteredListings.length" class="listing-grid">
        <article v-for="listing in filteredListings" :key="listing.id" class="listing-card">
          <button class="listing-photo" type="button" :aria-label="`View details for ${listing.name}`" @click="openListing(listing)">
            <img :src="listing.images[0]" :alt="listing.name" loading="lazy">
            <span v-if="listing.badge" class="listing-badge">{{ listing.badge }}</span>
          </button>
          <button class="save-button" type="button" :class="{ 'is-saved': savedListings.includes(listing.id) }" :aria-label="savedListings.includes(listing.id) ? `Remove ${listing.name} from saved items` : `Save ${listing.name}`" :aria-pressed="savedListings.includes(listing.id)" @click="toggleSaved(listing.id)">
            <svg viewBox="0 0 20 20" :fill="savedListings.includes(listing.id) ? 'currentColor' : 'none'" aria-hidden="true"><path d="M16.5 7.3c0 3.2-6.5 8-6.5 8s-6.5-4.8-6.5-8a3.5 3.5 0 0 1 6.5-1.8 3.5 3.5 0 0 1 6.5 1.8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
          </button>
          <div class="listing-details">
            <div class="listing-heading">
              <h3><button class="listing-name-button" type="button" @click="openListing(listing)">{{ listing.name }}</button></h3>
              <span class="listing-price">KSh {{ listing.price.toLocaleString('en-KE') }}</span>
            </div>
            <span class="listing-seller">{{ listing.seller }}</span>
            <div class="listing-meta">
              <span class="listing-category">{{ listing.category }}</span>
              <span class="listing-location">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 6.7c0 3.3-5 7.3-5 7.3S3 10 3 6.7a5 5 0 1 1 10 0Z" stroke="currentColor" stroke-width="1.25" /><circle cx="8" cy="6.5" r="1.6" stroke="currentColor" stroke-width="1.25" /></svg>
                {{ listing.location }}
              </span>
            </div>
            <button class="add-cart-button" type="button" :disabled="listing.stock < 1" @click="addToCart(listing)">
              {{ listing.stock > 0 ? (user ? 'Add to cart' : 'Sign in to shop') : 'Sold out' }}
            </button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <span aria-hidden="true">✳</span>
        <h3>No finds just yet.</h3>
        <p>Try a different search or pick another category.</p>
        <button type="button" @click="searchQuery = ''; selectedCategory = 'All finds'">See all finds</button>
      </div>

      <div class="more-finds" id="story">
        <span>There's always something good around the corner.</span>
        <button type="button" @click="user ? (user.role === 'admin' ? emit('admin-view') : (pageMessage = 'Ask an administrator to list an item for sale.')) : emit('sign-in')">
          {{ user?.role === 'admin' ? 'Manage marketplace items' : 'Share something you love' }} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="cartOpen" class="cart-backdrop" @click.self="cartOpen = false" @keydown.esc="cartOpen = false">
        <section class="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <button class="cart-close" type="button" aria-label="Close cart" @click="cartOpen = false">×</button>
          <span class="section-eyebrow">YOUR GOOD FINDS</span>
          <h2 id="cart-title">Your cart<span>.</span></h2>
          <p v-if="cartLoading" class="cart-empty">Loading your cart…</p>
          <p v-else-if="!cartItems.length" class="cart-empty">Your cart is waiting for something good.</p>
          <div v-else class="cart-items">
            <article v-for="item in cartItems" :key="item.id" class="cart-item">
              <img :src="item.images[0]" :alt="item.name">
              <div class="cart-item-copy">
                <h3>{{ item.name }}</h3>
                <span>Qty {{ item.quantity }} · KSh {{ (item.price * item.quantity).toLocaleString('en-KE') }}</span>
              </div>
              <button type="button" :aria-label="`Remove ${item.name} from cart`" @click="removeFromCart(item.id)">Remove</button>
            </article>
          </div>
          <div v-if="cartItems.length" class="cart-summary">
            <span>Total</span>
            <strong>KSh {{ cartTotal.toLocaleString('en-KE') }}</strong>
          </div>
          <p class="demo-payment-note">Demo checkout records the order; it does not charge real money.</p>
          <button class="checkout-button" type="button" :disabled="!cartItems.length || checkoutLoading" @click="checkout">
            {{ checkoutLoading ? 'Placing order…' : 'Buy now' }} <span aria-hidden="true">↗</span>
          </button>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="selectedListing" class="listing-detail-backdrop" @click.self="closeListing" @keydown.esc="closeListing">
        <section class="listing-detail-dialog" role="dialog" aria-modal="true" :aria-labelledby="`listing-title-${selectedListing.id}`">
          <button class="detail-close-button" type="button" aria-label="Close item details" @click="closeListing">×</button>
          <div class="detail-gallery">
            <img class="detail-main-photo" :src="selectedListing.images[selectedPhotoIndex]" :alt="`${selectedListing.name}, photo ${selectedPhotoIndex + 1} of ${selectedListing.images.length}`">
            <span v-if="selectedListing.images.length > 1" class="detail-photo-count">{{ selectedPhotoIndex + 1 }} / {{ selectedListing.images.length }}</span>
            <button
              v-if="selectedListing.images.length > 1"
              class="gallery-arrow gallery-previous"
              type="button"
              aria-label="Previous photo"
              @click="showListingPhoto(selectedPhotoIndex - 1)"
            >‹</button>
            <button
              v-if="selectedListing.images.length > 1"
              class="gallery-arrow gallery-next"
              type="button"
              aria-label="Next photo"
              @click="showListingPhoto(selectedPhotoIndex + 1)"
            >›</button>
            <div v-if="selectedListing.images.length > 1" class="detail-thumbnails" aria-label="All item photos">
              <button
                v-for="(image, index) in selectedListing.images"
                :key="image"
                type="button"
                :class="{ 'thumbnail-active': selectedPhotoIndex === index }"
                :aria-label="`View photo ${index + 1} of ${selectedListing.images.length}`"
                :aria-pressed="selectedPhotoIndex === index"
                @click="showListingPhoto(index)"
              >
                <img :src="image" :alt="`${selectedListing.name}, photo ${index + 1}`">
              </button>
            </div>
          </div>
          <div class="detail-copy">
            <span class="detail-category">{{ selectedListing.category }}</span>
            <h2 :id="`listing-title-${selectedListing.id}`">{{ selectedListing.name }}</h2>
            <p class="detail-price">KSh {{ selectedListing.price.toLocaleString('en-KE') }}</p>
            <p class="detail-seller">Sold by <strong>{{ selectedListing.seller }}</strong></p>
            <p class="detail-location">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 6.7c0 3.3-5 7.3-5 7.3S3 10 3 6.7a5 5 0 1 1 10 0Z" stroke="currentColor" stroke-width="1.25" /><circle cx="8" cy="6.5" r="1.6" stroke="currentColor" stroke-width="1.25" /></svg>
              {{ selectedListing.location }}
            </p>
            <p class="detail-description">A thoughtful find from a local seller. Get in touch to learn more about this item.</p>
            <button class="detail-contact-button" type="button" @click="addToCart(selectedListing)">
              {{ user ? 'Add to cart' : 'Sign in to shop' }} <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <footer class="site-footer">
      <a class="brand footer-brand" href="/" aria-label="Polysoko home">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M5 10.5h22l-2 17H7l-2-17Z" fill="currentColor" /><path d="M11 12V8a5 5 0 0 1 10 0v4" stroke="#174E3B" stroke-width="2.4" stroke-linecap="round" /><path d="m12 19 2.7 2.7 5.6-5.8" stroke="#174E3B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
        <span>polysoko<span class="brand-period">.</span></span>
      </a>
      <span>Good things, close to home. <span class="footer-flower">✳</span></span>
      <span>© 2026 Polysoko</span>
    </footer>
  </main>
</template>

<style scoped>
:global(:root) { color: #23362b; background: #fbfaf6; }
:global(body) { background: #fbfaf6; }
.marketplace { --green: #174e3b; --ink: #26372c; --cream: #fbfaf6; overflow: hidden; background: var(--cream); color: var(--ink); font-family: 'Segoe UI', sans-serif; }
.announcement-bar { display: flex; min-height: 34px; align-items: center; justify-content: center; gap: 20px; background: #174e3b; color: #e8efdf; font-size: 10px; }
.announcement-location { display: inline-flex; align-items: center; gap: 5px; color: #c1d1b3; }
.announcement-location svg { width: 14px; height: 14px; }
.site-header, .hero, .discover-section, .site-footer { width: min(100% - 96px, 1296px); margin-right: auto; margin-left: auto; }
.site-header { display: flex; height: 82px; align-items: center; justify-content: space-between; border-bottom: 1px solid #eaeae1; }
.brand { display: inline-flex; align-items: center; gap: 9px; color: var(--green); font-size: 21px; font-weight: 800; letter-spacing: -1px; text-decoration: none; }
.brand-mark { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 11px; background: #d3ebaa; }
.brand-mark svg { width: 25px; height: 25px; }
.brand-period { color: #a4b97f; }
.header-links, .header-actions { display: flex; height: 100%; align-items: center; }
.header-links { gap: 36px; }
.header-links a { position: relative; display: grid; height: 100%; align-items: center; color: #788176; font-size: 12px; text-decoration: none; }
.header-links a:hover, .header-links a.active-link { color: var(--green); }
.header-links a.active-link::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: #86a46e; content: ''; }
.header-actions { gap: 16px; }
.sell-link, .sign-in-button { border: 0; background: transparent; color: var(--green); font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
.sell-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.sign-in-button { display: inline-flex; min-height: 38px; align-items: center; gap: 15px; padding: 0 16px; border-radius: 5px; background: var(--green); color: #fff; transition: background .18s, transform .18s; }
.sign-in-button:hover, .hero-cta:hover { transform: translateY(-1px); background: #246548; }
.account-name { max-width: 130px; overflow: hidden; color: #758071; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.cart-button { display: inline-flex; min-height: 34px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid #e1e6db; border-radius: 4px; background: transparent; color: #42644c; font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.cart-button:hover { background: #f0f3ea; }
.cart-count { display: grid; min-width: 17px; height: 17px; place-items: center; border-radius: 50%; background: #e8efdf; color: #42644c; font-size: 8px; }
.page-message { width: min(100% - 96px, 1296px); margin: 12px auto -4px; padding: 9px 12px; border-radius: 3px; font-size: 10px; }
.page-message-success { background: #edf4e9; color: #426b3e; }
.page-message-error { background: #fff0ed; color: #a33b2c; }
.catalog-loading { min-height: 150px; padding: 50px 0; color: #899184; font-size: 11px; text-align: center; }
.hero { display: grid; min-height: 470px; grid-template-columns: 1fr 1.05fr; align-items: center; padding: 42px 44px 38px 70px; border-bottom: 1px solid #eaeae1; }
.hero-copy { position: relative; z-index: 1; padding: 12px 0 6px; }
.hero-eyebrow, .section-eyebrow { display: flex; align-items: center; gap: 9px; color: #82916f; font-size: 9px; font-weight: 700; letter-spacing: 1.65px; }
.eyebrow-line { width: 22px; height: 1px; background: #a8bb8d; }
.hero h1 { margin: 24px 0 14px; color: #254232; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(52px, 6vw, 78px); font-weight: 400; letter-spacing: -4px; line-height: .98; }
.hero h1 span, .section-topline h2 em { color: #8a9e70; font-weight: 400; }
.hero-copy > p { max-width: 355px; margin: 0; color: #858b7f; font-size: 13px; line-height: 1.8; }
.hero-cta { display: inline-flex; min-height: 43px; align-items: center; gap: 21px; margin-top: 23px; padding: 0 17px; border-radius: 4px; background: var(--green); color: #fff; font-size: 11px; font-weight: 600; text-decoration: none; transition: background .18s, transform .18s; }
.hero-cta svg { width: 16px; height: 16px; }
.hero-note { display: flex; align-items: center; gap: 12px; margin-top: 33px; color: #92978d; font-size: 9px; }
.hero-note strong { color: #596b58; font-weight: 600; }
.avatar-stack { display: inline-flex; padding-left: 2px; }
.avatar-stack i { display: grid; width: 23px; height: 23px; place-items: center; margin-left: -3px; border: 2px solid var(--cream); border-radius: 50%; background: #dcc2a6; color: #fff; font-size: 8px; font-style: normal; font-weight: 700; }
.avatar-stack i:nth-child(2) { background: #82916f; }
.avatar-stack i:nth-child(3) { background: #bf8d6a; }
.hero-art { position: relative; height: 385px; }
.hero-art-backdrop { position: absolute; top: 28px; right: 6px; width: 86%; height: 85%; border-radius: 48% 48% 4px 4px; background: #e9ebdd; transform: rotate(2deg); }
.hero-photo { position: absolute; overflow: hidden; background: #e5e6da; box-shadow: 0 14px 34px rgba(41, 58, 38, .11); }
.hero-photo img, .listing-photo img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .45s cubic-bezier(.2, .65, .25, 1); }
.hero-photo-main { top: 7px; right: 56px; width: 65%; height: 82%; border-radius: 49% 49% 4px 4px; }
.hero-photo-small { right: 0; bottom: 6px; width: 29%; height: 39%; border: 6px solid var(--cream); border-radius: 47% 47% 3px 3px; transform: rotate(4deg); }
.hero-sticker { position: absolute; z-index: 2; top: 27px; left: 13px; display: flex; width: 82px; height: 82px; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; background: #d7e5bd; color: #385b3f; font-size: 8px; font-weight: 700; letter-spacing: .65px; line-height: 1.4; text-align: center; transform: rotate(-10deg); }
.hero-sticker span { position: absolute; right: -7px; bottom: -4px; color: #759163; font-size: 21px; }
.hero-scribble { position: absolute; bottom: 25px; left: 52px; color: #7e8d70; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-style: italic; transform: rotate(-8deg); }
.hero-scribble span { margin-left: 5px; font-family: 'Segoe UI', sans-serif; font-size: 17px; font-style: normal; }
.discover-section { padding: 61px 0 36px; }
.section-topline { display: flex; align-items: end; justify-content: space-between; gap: 25px; }
.section-topline h2 { margin: 9px 0 0; color: #294435; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(29px, 3.5vw, 39px); font-weight: 400; letter-spacing: -1.2px; }
.section-topline h2 em { font-style: italic; }
.search-box { display: flex; width: min(100%, 273px); height: 40px; align-items: center; gap: 9px; padding: 0 10px; border: 1px solid #e7e8df; border-radius: 4px; background: rgba(255,255,255,.6); color: #879081; }
.search-box:focus-within { border-color: #9baa89; box-shadow: 0 0 0 3px rgba(113,149,105,.11); }
.search-box svg { width: 17px; height: 17px; flex: 0 0 auto; }
.search-box input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 10px; }
.search-box input::placeholder { color: #a3a99e; }
.search-box kbd { display: grid; width: 17px; height: 19px; flex: 0 0 auto; place-items: center; border: 1px solid #e8e9e2; border-radius: 3px; color: #9ca398; font: inherit; font-size: 9px; }
.discovery-controls { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 27px 0 22px; padding-bottom: 12px; border-bottom: 1px solid #eaeae1; }
.category-list { display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.category-list::-webkit-scrollbar { display: none; }
.category-list button { min-height: 30px; flex: 0 0 auto; padding: 0 12px; border: 1px solid transparent; border-radius: 3px; background: transparent; color: #7e867a; font: inherit; font-size: 10px; cursor: pointer; }
.category-list button:hover { border-color: #dfe4d6; color: var(--green); }
.category-list button.category-active { border-color: #174e3b; background: #174e3b; color: #fff; }
.results-count { flex: 0 0 auto; color: #93988e; font-size: 9px; }
.listing-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 22px; row-gap: 31px; }
.listing-card { position: relative; min-width: 0; }
.listing-photo { position: relative; display: block; width: 100%; height: clamp(170px, 20vw, 250px); overflow: hidden; padding: 0; border: 0; border-radius: 3px; background: #eeede6; cursor: pointer; }
.listing-card:hover .listing-photo img { transform: scale(1.045); }
.listing-badge { position: absolute; bottom: 10px; left: 10px; padding: 6px 8px; background: rgba(251,250,246,.94); color: #586d4c; font-size: 7px; font-weight: 700; letter-spacing: .85px; }
.save-button { position: absolute; top: 9px; right: 9px; display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 50%; background: rgba(251,250,246,.95); color: #657461; cursor: pointer; }
.save-button:hover, .save-button.is-saved { color: #ae6558; }
.save-button svg { width: 18px; height: 18px; }
.listing-details { padding: 12px 1px 0; }
.listing-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.listing-heading h3 { overflow: hidden; min-width: 0; margin: 0; font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.listing-name-button { overflow: hidden; max-width: 100%; padding: 0; border: 0; background: transparent; color: #344539; font: inherit; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.listing-name-button:hover { color: #55744c; text-decoration: underline; text-underline-offset: 3px; }
.listing-price { flex: 0 0 auto; color: #294b37; font-size: 10px; font-weight: 700; }
.listing-seller { display: block; margin-top: 5px; color: #93988e; font-size: 9px; }
.listing-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
.listing-category { overflow: hidden; color: #73816d; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.listing-location { display: inline-flex; min-width: 0; align-items: center; gap: 3px; color: #999e94; font-size: 8px; white-space: nowrap; }
.listing-location svg { width: 13px; height: 13px; flex: 0 0 auto; }
.add-cart-button { display: block; width: 100%; min-height: 31px; margin-top: 12px; border: 1px solid #dfe4d8; border-radius: 3px; background: transparent; color: #416148; font: inherit; font-size: 9px; font-weight: 600; cursor: pointer; transition: background .16s, color .16s; }
.add-cart-button:hover:not(:disabled) { border-color: #174e3b; background: #174e3b; color: #fff; }
.add-cart-button:disabled { color: #a2a79d; cursor: not-allowed; }
.empty-state { display: flex; min-height: 240px; flex-direction: column; align-items: center; justify-content: center; color: #858b7f; text-align: center; }
.empty-state > span { color: #91a47a; font-size: 25px; }
.empty-state h3 { margin: 10px 0 4px; color: #344539; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 400; }
.empty-state p { margin: 0; font-size: 11px; }
.empty-state button { margin-top: 13px; border: 0; background: transparent; color: var(--green); font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.listing-detail-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; overflow-y: auto; place-items: center; padding: 24px; background: rgba(23,45,33,.58); backdrop-filter: blur(3px); }
.listing-detail-dialog { position: relative; display: grid; width: min(100%, 900px); min-height: 430px; grid-template-columns: 1.05fr .95fr; overflow: hidden; border: 1px solid #e8e9df; border-radius: 7px; background: #fbfaf6; box-shadow: 0 24px 80px rgba(18,37,26,.25); }
.detail-close-button { position: absolute; z-index: 3; top: 12px; right: 12px; display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 50%; background: rgba(251,250,246,.95); color: #52604f; font: inherit; font-size: 24px; cursor: pointer; }
.detail-gallery { position: relative; display: flex; min-height: 430px; flex-direction: column; justify-content: center; padding: 22px; background: #f0f1e9; }
.detail-main-photo { display: block; width: 100%; height: 350px; border-radius: 3px; background: #e7e8df; object-fit: contain; }
.detail-photo-count { position: absolute; right: 34px; bottom: 96px; padding: 5px 8px; border-radius: 3px; background: rgba(35,54,43,.75); color: #fff; font-size: 9px; }
.gallery-arrow { position: absolute; top: 50%; display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 50%; background: rgba(251,250,246,.95); color: #355a40; font-size: 23px; line-height: 1; cursor: pointer; transform: translateY(-50%); }
.gallery-previous { left: 30px; }
.gallery-next { right: 30px; }
.detail-thumbnails { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }
.detail-thumbnails button { width: 48px; height: 48px; overflow: hidden; padding: 0; border: 2px solid transparent; border-radius: 3px; background: #e7e8df; cursor: pointer; }
.detail-thumbnails button.thumbnail-active { border-color: #55744c; }
.detail-thumbnails img { display: block; width: 100%; height: 100%; object-fit: cover; }
.detail-copy { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 58px 38px 38px; }
.detail-category { color: #82916f; font-size: 9px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase; }
.detail-copy h2 { margin: 12px 0 7px; color: #294435; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(27px, 4vw, 37px); font-weight: 400; letter-spacing: -.8px; line-height: 1.1; }
.detail-price { margin: 0; color: #294b37; font-size: 17px; font-weight: 700; }
.detail-seller { margin: 23px 0 0; color: #858b7f; font-size: 11px; }
.detail-seller strong { color: #52604f; font-weight: 600; }
.detail-location { display: inline-flex; align-items: center; gap: 6px; margin: 10px 0 0; color: #858b7f; font-size: 10px; }
.detail-location svg { width: 15px; height: 15px; }
.detail-description { margin: 25px 0; color: #7d8579; font-size: 11px; line-height: 1.7; }
.detail-contact-button { display: inline-flex; min-height: 42px; align-items: center; gap: 15px; padding: 0 15px; border: 0; border-radius: 4px; background: #174e3b; color: #fff; font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.detail-contact-button:hover { background: #246548; }
.cart-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; overflow-y: auto; place-items: center; padding: 20px; background: rgba(23,45,33,.52); backdrop-filter: blur(3px); }
.cart-dialog { position: relative; width: min(100%, 520px); max-height: min(85vh, 720px); overflow-y: auto; padding: 30px; border: 1px solid #e8e9df; border-radius: 6px; background: #fbfaf6; box-shadow: 0 24px 80px rgba(18,37,26,.25); }
.cart-close { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; color: #52604f; font: inherit; font-size: 23px; cursor: pointer; }
.cart-close:hover { background: #eef0e8; }
.cart-dialog h2 { margin: 7px 0 18px; color: #294435; font-family: Georgia, 'Times New Roman', serif; font-size: 30px; font-weight: 400; }
.cart-dialog h2 span { color: #91a47a; }
.cart-items { display: flex; flex-direction: column; }
.cart-item { display: flex; align-items: center; gap: 11px; padding: 11px 0; border-top: 1px solid #e9ece4; }
.cart-item > img { width: 52px; height: 52px; flex: 0 0 auto; border-radius: 3px; background: #eef0e9; object-fit: cover; }
.cart-item-copy { min-width: 0; flex: 1; }
.cart-item-copy h3 { overflow: hidden; margin: 0 0 5px; color: #344539; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.cart-item-copy span { color: #858e80; font-size: 9px; }
.cart-item > button { padding: 5px; border: 0; background: transparent; color: #a75b4f; font: inherit; font-size: 9px; cursor: pointer; }
.cart-empty { padding: 18px 0; border-top: 1px solid #e9ece4; color: #858e80; font-size: 11px; }
.cart-summary { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 14px; border-top: 1px solid #e2e6dd; color: #586650; font-size: 11px; }
.cart-summary strong { color: #294b37; }
.demo-payment-note { margin: 14px 0; color: #92998e; font-size: 9px; line-height: 1.5; }
.checkout-button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 12px; padding: 0 15px; border: 0; border-radius: 4px; background: #174e3b; color: #fff; font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.checkout-button:hover:not(:disabled) { background: #246548; }
.checkout-button:disabled { cursor: not-allowed; opacity: .55; }
.more-finds { display: flex; min-height: 71px; align-items: center; justify-content: space-between; gap: 20px; margin-top: 40px; padding: 0 21px; border: 1px solid #e6e8df; border-radius: 3px; color: #788173; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-style: italic; }
.more-finds button { display: inline-flex; align-items: center; gap: 12px; padding: 9px 11px; border: 1px solid #dfe4d8; border-radius: 3px; background: transparent; color: var(--green); font-family: 'Segoe UI', sans-serif; font-size: 9px; font-style: normal; font-weight: 600; cursor: pointer; }
.more-finds button:hover { background: #f0f3ea; }
.site-footer { display: flex; min-height: 76px; align-items: center; justify-content: space-between; border-top: 1px solid #eaeae1; color: #9a9e94; font-size: 9px; }
.footer-brand { font-size: 16px; }
.footer-brand .brand-mark { width: 28px; height: 28px; border-radius: 9px; }
.footer-brand .brand-mark svg { width: 21px; height: 21px; }
.footer-flower { color: #93a47e; }
.marketplace button:focus-visible, .marketplace a:focus-visible, .marketplace input:focus-visible { outline: 2px solid #779469; outline-offset: 3px; }

@media (max-width: 900px) {
  .site-header, .hero, .discover-section, .site-footer { width: min(100% - 48px, 1296px); }
  .page-message { width: min(100% - 48px, 1296px); }
  .header-links { gap: 20px; }
  .hero { min-height: 430px; grid-template-columns: .95fr 1fr; padding: 30px 12px 30px 24px; }
  .hero-art { height: 340px; }
  .listing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 18px; row-gap: 25px; }
  .listing-photo { height: clamp(200px, 34vw, 310px); }
}

@media (max-width: 620px) {
  .announcement-bar { min-height: 31px; font-size: 9px; }
  .site-header, .hero, .discover-section, .site-footer { width: calc(100% - 36px); }
  .page-message { width: calc(100% - 36px); }
  .site-header { height: 67px; }
  .brand { gap: 7px; font-size: 18px; }
  .brand-mark { width: 30px; height: 30px; border-radius: 9px; }
  .brand-mark svg { width: 22px; height: 22px; }
  .header-links { display: none; }
  .header-actions { gap: 8px; }
  .sell-link, .sign-in-button { font-size: 9px; }
  .sign-in-button { min-height: 34px; gap: 8px; padding: 0 11px; }
  .account-name { display: none; }
  .cart-button { min-height: 31px; gap: 4px; padding: 0 7px; font-size: 9px; }
  .hero { min-height: initial; grid-template-columns: 1fr; padding: 39px 4px 22px; }
  .hero-copy { padding: 0; }
  .hero h1 { margin: 18px 0 11px; font-size: clamp(51px, 15vw, 68px); letter-spacing: -3.2px; }
  .hero-copy > p { max-width: 320px; font-size: 12px; }
  .hero-cta { min-height: 40px; margin-top: 17px; font-size: 10px; }
  .hero-note { margin-top: 19px; font-size: 8px; }
  .hero-art { height: 285px; margin: 15px 3px 0 12px; }
  .hero-art-backdrop { right: 7px; width: 82%; height: 88%; }
  .hero-photo-main { right: 38px; width: 68%; height: 86%; }
  .hero-photo-small { width: 29%; height: 39%; }
  .hero-sticker { top: 9px; left: 5px; width: 70px; height: 70px; font-size: 7px; }
  .hero-scribble { bottom: 11px; left: 27px; font-size: 11px; }
  .discover-section { padding: 42px 0 24px; }
  .section-topline { align-items: flex-start; flex-direction: column; gap: 15px; }
  .section-topline h2 { font-size: clamp(29px, 8vw, 35px); }
  .search-box { width: 100%; }
  .discovery-controls { align-items: flex-end; margin: 19px 0 17px; gap: 8px; }
  .category-list { gap: 4px; }
  .category-list button { min-height: 28px; padding: 0 9px; font-size: 9px; }
  .results-count { padding-bottom: 8px; font-size: 8px; }
  .listing-grid { column-gap: 12px; row-gap: 20px; }
  .listing-photo { height: clamp(155px, 47vw, 235px); }
  .listing-badge { bottom: 7px; left: 7px; padding: 5px 6px; font-size: 6px; }
  .save-button { top: 7px; right: 7px; width: 28px; height: 28px; }
  .save-button svg { width: 16px; height: 16px; }
  .listing-details { padding-top: 9px; }
  .listing-heading { align-items: flex-start; flex-direction: column; gap: 3px; }
  .listing-heading h3, .listing-name-button { max-width: 100%; font-size: 10px; }
  .listing-price { font-size: 10px; }
  .listing-seller { margin-top: 4px; font-size: 8px; }
  .listing-meta { align-items: flex-start; flex-direction: column; gap: 5px; margin-top: 8px; }
  .add-cart-button { min-height: 29px; margin-top: 9px; }
  .more-finds { min-height: 67px; align-items: flex-start; flex-direction: column; justify-content: center; gap: 8px; margin-top: 26px; padding: 12px; font-size: 12px; }
  .more-finds button { padding: 7px 9px; }
  .site-footer { min-height: 68px; gap: 8px; font-size: 8px; }
  .footer-brand { font-size: 14px; }
  .footer-brand .brand-mark { width: 25px; height: 25px; }
  .site-footer > span:nth-child(2) { display: none; }
}

@media (max-width: 620px) {
  .listing-detail-backdrop { padding: 14px; }
  .listing-detail-dialog { grid-template-columns: 1fr; }
  .detail-gallery { min-height: 0; padding: 14px; }
  .detail-main-photo { height: min(58vh, 360px); }
  .detail-photo-count { right: 25px; bottom: 76px; }
  .gallery-previous { left: 21px; }
  .gallery-next { right: 21px; }
  .detail-thumbnails button { width: 42px; height: 42px; }
  .detail-copy { padding: 25px 23px 24px; }
  .detail-seller { margin-top: 15px; }
  .detail-description { margin: 17px 0; }
  .cart-dialog { padding: 25px 19px 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .marketplace *, .marketplace *::before, .marketplace *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>