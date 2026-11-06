<script setup lang="ts">
import AddUser from './AddUser.vue'

type Product = {
  id: string
  name: string
  category: string
  price: number
  location: string
  seller: string
  images: string[]
  stock: number
  active: boolean
}

type AdminUser = { id: string, name: string, email: string, role: string, createdAt: string }
type Order = {
  id: string
  customerName: string
  customerEmail: string
  total: number
  createdAt: string
  items: { name: string, quantity: number, unitPrice: number }[]
}

const emit = defineEmits<{ 'open-store': [], 'sign-out': [] }>()
const categories = ['Home & living', 'Fashion', 'Electronics', 'Art & craft', 'Food & drink']
const activeTab = ref<'overview' | 'products' | 'users' | 'orders'>('overview')
const products = ref<Product[]>([])
const users = ref<AdminUser[]>([])
const orders = ref<Order[]>([])
const walletBalance = ref(0)
const isLoading = ref(true)
const isSaving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const showUserForm = ref(false)
const showProductForm = ref(false)
const productPhotos = ref<{ file: File, url: string }[]>([])
const photoError = ref('')
const productForm = reactive({
  name: '',
  category: 'Home & living',
  price: '',
  location: '',
  seller: '',
  stock: '10',
  images: ''
})
const linkedProductImages = computed(() => productForm.images.split(/\r?\n/).map(image => image.trim()).filter(Boolean))
const totalProductImages = computed(() => productPhotos.value.length + linkedProductImages.value.length)

const orderCount = computed(() => orders.value.length)

async function loadDashboard() {
  isLoading.value = true
  try {
    const [productResponse, userResponse, orderResponse, walletResponse] = await Promise.all([
      $fetch<{ products: Product[] }>('/api/admin/products'),
      $fetch<{ users: AdminUser[] }>('/api/admin/users'),
      $fetch<{ orders: Order[] }>('/api/admin/orders'),
      $fetch<{ balance: number }>('/api/admin/wallet')
    ])
    products.value = productResponse.products
    users.value = userResponse.users
    orders.value = orderResponse.orders
    walletBalance.value = walletResponse.balance
  } catch (error: unknown) {
    message.value = getErrorMessage(error, 'Could not load the admin dashboard.')
    messageType.value = 'error'
  } finally {
    isLoading.value = false
  }
}

async function handleUserCreated() {
  showUserForm.value = false
  message.value = 'User account created.'
  messageType.value = 'success'
  await loadDashboard()
}

async function addProduct() {
  if (totalProductImages.value > 5) {
    photoError.value = 'Use no more than 5 uploaded photos and photo links combined.'
    return
  }

  isSaving.value = true
  message.value = ''
  try {
    const body = new FormData()
    body.append('name', productForm.name)
    body.append('category', productForm.category)
    body.append('price', productForm.price)
    body.append('location', productForm.location)
    body.append('seller', productForm.seller)
    body.append('stock', productForm.stock)
    body.append('images', JSON.stringify(linkedProductImages.value))
    productPhotos.value.forEach(photo => body.append('photos', photo.file))
    await $fetch('/api/admin/products', {
      method: 'POST',
      body
    })
    clearProductPhotos()
    Object.assign(productForm, {
      name: '',
      category: 'Home & living',
      price: '',
      location: '',
      seller: '',
      stock: '10',
      images: ''
    })
    showProductForm.value = false
    message.value = 'Item added to the marketplace.'
    messageType.value = 'success'
    await loadDashboard()
  } catch (error: unknown) {
    message.value = getErrorMessage(error, 'Could not add the marketplace item.')
    messageType.value = 'error'
  } finally {
    isSaving.value = false
  }
}

function handleProductPhotoSelection(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const files = Array.from(input.files ?? [])
  input.value = ''
  if (totalProductImages.value + files.length > 5) {
    photoError.value = 'Use no more than 5 uploaded photos and photo links combined.'
    return
  }

  const invalidFile = files.find(file =>
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    || file.size === 0
    || file.size > 5 * 1024 * 1024
  )
  if (invalidFile) {
    photoError.value = invalidFile.size > 5 * 1024 * 1024
      ? 'Each photo must be 5 MB or smaller.'
      : 'Choose JPEG, PNG, or WebP image files.'
    return
  }

  photoError.value = ''
  productPhotos.value.push(...files.map(file => ({ file, url: URL.createObjectURL(file) })))
}

function removeProductPhoto(index: number) {
  const [removedPhoto] = productPhotos.value.splice(index, 1)
  if (removedPhoto) URL.revokeObjectURL(removedPhoto.url)
  photoError.value = ''
}

function clearProductPhotos() {
  productPhotos.value.forEach(photo => URL.revokeObjectURL(photo.url))
  productPhotos.value = []
  photoError.value = ''
}

function closeProductForm() {
  showProductForm.value = false
  clearProductPhotos()
}

function toggleProductForm() {
  if (showProductForm.value) {
    closeProductForm()
  } else {
    showProductForm.value = true
  }
}

async function deleteProduct(product: Product) {
  if (!window.confirm(`Remove "${product.name}" from the marketplace?`)) return
  try {
    await $fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    message.value = `${product.name} removed from the marketplace.`
    messageType.value = 'success'
    await loadDashboard()
  } catch (error: unknown) {
    message.value = getErrorMessage(error, 'Could not remove this item.')
    messageType.value = 'error'
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

onBeforeUnmount(clearProductPhotos)
onMounted(loadDashboard)
</script>

<template>
  <main class="admin-page">
    <header class="admin-header">
      <a class="admin-brand" href="/" aria-label="Polysoko home"><span>p.</span> polysoko <small>ADMIN</small></a>
      <div class="admin-header-actions">
        <button type="button" class="store-button" @click="emit('open-store')">Open storefront ↗</button>
        <button type="button" class="logout-button" @click="emit('sign-out')">Log out</button>
      </div>
    </header>

    <div class="admin-layout">
      <aside class="admin-sidebar">
        <span class="sidebar-label">WORKSPACE</span>
        <button v-for="tab in (['overview', 'products', 'users', 'orders'] as const)" :key="tab" type="button" :class="{ 'tab-active': activeTab === tab }" @click="activeTab = tab">
          <span class="tab-icon">{{ { overview: '◫', products: '◇', users: '◎', orders: '↗' }[tab] }}</span>
          {{ { overview: 'Overview', products: 'Items for sale', users: 'Users', orders: 'Purchases' }[tab] }}
        </button>
        <div class="sidebar-note">Thoughtful finds.<br>Happier everyday.</div>
      </aside>

      <section class="admin-content">
        <div class="admin-page-heading">
          <div>
            <span class="admin-eyebrow">POLYSOKO MANAGEMENT</span>
            <h1>{{ { overview: 'Good morning, admin.', products: 'Items for sale.', users: 'Your community.', orders: 'Purchase history.' }[activeTab] }}</h1>
            <p>Manage your marketplace and keep the good finds flowing.</p>
          </div>
          <span class="date-chip">{{ new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
        </div>

        <p v-if="message" class="admin-message" :class="`admin-message-${messageType}`" role="status" aria-live="polite">{{ message }}</p>
        <p v-if="isLoading" class="loading-note">Loading marketplace data…</p>

        <template v-else>
          <div v-if="activeTab === 'overview'" class="admin-stats">
            <article class="stat-card wallet-stat">
              <span class="stat-label">RECORDED SALES</span>
              <strong>KSh {{ walletBalance.toLocaleString('en-KE') }}</strong>
              <span class="stat-caption">Demo order total · no real payments collected</span>
              <span class="stat-decoration">✳</span>
            </article>
            <article class="stat-card">
              <span class="stat-label">ACTIVE ITEMS</span>
              <strong>{{ products.filter(product => product.active).length }}</strong>
              <span class="stat-caption">Items currently in the shop</span>
            </article>
            <article class="stat-card">
              <span class="stat-label">REGISTERED USERS</span>
              <strong>{{ users.length }}</strong>
              <span class="stat-caption">Members in your community</span>
            </article>
            <article class="stat-card">
              <span class="stat-label">PURCHASES</span>
              <strong>{{ orderCount }}</strong>
              <span class="stat-caption">Completed demo checkouts</span>
            </article>
          </div>

          <section v-if="activeTab === 'overview' || activeTab === 'products'" class="admin-panel">
            <div class="panel-heading">
              <div><span class="admin-eyebrow">THE CATALOG</span><h2>Items for sale</h2></div>
              <button class="primary-action" type="button" @click="toggleProductForm">+ Add item</button>
            </div>
            <form v-if="showProductForm" class="admin-form" @submit.prevent="addProduct">
              <label>Item name<input v-model="productForm.name" maxlength="100" required placeholder="e.g. Handwoven market basket"></label>
              <div class="admin-form-row">
                <label>Category<select v-model="productForm.category"><option v-for="category in categories" :key="category">{{ category }}</option></select></label>
                <label>Price (KSh)<input v-model="productForm.price" type="number" min="1" max="99999999" required></label>
                <label>Stock<input v-model="productForm.stock" type="number" min="1" max="10000" required></label>
              </div>
              <div class="admin-form-row">
                <label>Sale location<input v-model="productForm.location" maxlength="100" required placeholder="Nairobi"></label>
                <label>Seller / shop<input v-model="productForm.seller" maxlength="100" required placeholder="Shop name"></label>
              </div>
              <label>Product photos <span>OPTIONAL · UP TO 5 · JPEG, PNG, OR WEBP</span>
                <input class="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="totalProductImages >= 5" @change="handleProductPhotoSelection">
                <span class="photo-help">{{ totalProductImages }} of 5 photos or links selected. Choose multiple at once or add another batch; each photo can be up to 5 MB.</span>
                <span v-if="photoError" class="photo-error" role="alert">{{ photoError }}</span>
                <span v-if="productPhotos.length" class="photo-preview-list" aria-label="Selected photo previews">
                  <span v-for="(photo, index) in productPhotos" :key="photo.url" class="photo-preview">
                    <img :src="photo.url" :alt="`Product photo ${index + 1}: ${photo.file.name}`">
                    <button type="button" :aria-label="`Remove photo ${index + 1}`" @click="removeProductPhoto(index)">×</button>
                  </span>
                </span>
              </label>
              <label>Or add photo links <span>OPTIONAL · HTTPS, ONE PER LINE</span><textarea v-model="productForm.images" rows="2" placeholder="https://example.com/item.jpg"></textarea></label>
              <div class="form-actions"><button type="button" class="secondary-action" @click="closeProductForm">Cancel</button><button type="submit" class="primary-action" :disabled="isSaving">{{ isSaving ? 'Saving…' : 'Add to marketplace' }}</button></div>
            </form>
            <div v-if="products.length" class="table-wrap">
              <table>
                <thead><tr><th>ITEM</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th /></tr></thead>
                <tbody>
                  <tr v-for="product in (activeTab === 'overview' ? products.slice(0, 5) : products)" :key="product.id">
                    <td class="product-cell"><img :src="product.images[0]" :alt="product.name"><span><strong>{{ product.name }}</strong><small>{{ product.category }} · {{ product.location }}</small></span></td>
                    <td>KSh {{ product.price.toLocaleString('en-KE') }}</td>
                    <td>{{ product.stock }}</td>
                    <td><span class="status-chip" :class="{ 'status-inactive': !product.active }">{{ product.active ? 'Active' : 'Removed' }}</span></td>
                    <td><button v-if="product.active" class="delete-action" type="button" @click="deleteProduct(product)">Remove</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="empty-note">No products in the catalog yet.</p>
          </section>

          <section v-if="activeTab === 'overview' || activeTab === 'users'" class="admin-panel">
            <div class="panel-heading">
              <div><span class="admin-eyebrow">THE COMMUNITY</span><h2>Users</h2></div>
              <button class="primary-action" type="button" @click="showUserForm = !showUserForm">+ Add user</button>
            </div>
            <AddUser v-if="showUserForm" @created="handleUserCreated" @cancel="showUserForm = false" />
            <div class="table-wrap">
              <table>
                <thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>JOINED</th></tr></thead>
                <tbody>
                  <tr v-for="person in (activeTab === 'overview' ? users.slice(0, 5) : users)" :key="person.id">
                    <td><strong>{{ person.name }}</strong></td><td>{{ person.email }}</td><td><span class="status-chip" :class="{ 'admin-chip': person.role === 'admin' }">{{ person.role }}</span></td><td>{{ person.createdAt }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="activeTab === 'overview' || activeTab === 'orders'" class="admin-panel">
            <div class="panel-heading"><div><span class="admin-eyebrow">CUSTOMER CHECKOUTS</span><h2>Purchases</h2></div></div>
            <div v-if="orders.length" class="table-wrap">
              <table>
                <thead><tr><th>ORDER / CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>DATE</th></tr></thead>
                <tbody>
                  <tr v-for="order in (activeTab === 'overview' ? orders.slice(0, 5) : orders)" :key="order.id">
                    <td><strong>{{ order.customerName }}</strong><small class="table-subline">{{ order.customerEmail }} · #{{ order.id.slice(0, 8) }}</small></td>
                    <td>{{ order.items.map(item => `${item.name} × ${item.quantity}`).join(', ') }}</td>
                    <td><strong>KSh {{ order.total.toLocaleString('en-KE') }}</strong></td><td>{{ order.createdAt }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="empty-note">No purchases yet. Demo checkouts will appear here.</p>
          </section>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
.admin-page { min-height: 100vh; background: #f7f8f3; color: #293a2f; font-family: 'Segoe UI', sans-serif; }
.admin-header { display: flex; height: 72px; align-items: center; justify-content: space-between; padding: 0 42px; border-bottom: 1px solid #e8ebe2; background: #fff; }
.admin-brand { display: flex; align-items: center; gap: 9px; color: #174e3b; font-size: 19px; font-weight: 800; letter-spacing: -.8px; text-decoration: none; }
.admin-brand > span { display: grid; width: 31px; height: 31px; place-items: center; border-radius: 9px; background: #d3ebaa; font-family: Georgia, serif; }
.admin-brand small { margin-left: 5px; padding: 4px 6px; border-radius: 3px; background: #edf2e8; color: #69825c; font-size: 8px; letter-spacing: 1px; }
.admin-header-actions { display: flex; gap: 10px; }
.store-button, .logout-button, .primary-action, .secondary-action { min-height: 36px; padding: 0 13px; border: 1px solid #dfe5da; border-radius: 4px; background: #fff; color: #42644c; font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.store-button:hover, .secondary-action:hover { background: #f0f3ea; }
.logout-button { border-color: #174e3b; background: #174e3b; color: #fff; }
.admin-layout { display: grid; max-width: 1500px; min-height: calc(100vh - 72px); grid-template-columns: 220px minmax(0, 1fr); margin: 0 auto; }
.admin-sidebar { position: relative; display: flex; flex-direction: column; gap: 5px; padding: 32px 16px; border-right: 1px solid #e8ebe2; background: #fff; }
.sidebar-label, .admin-eyebrow { color: #8a967d; font-size: 8px; font-weight: 700; letter-spacing: 1.4px; }
.sidebar-label { margin: 2px 10px 12px; }
.admin-sidebar > button { display: flex; min-height: 40px; align-items: center; gap: 11px; padding: 0 11px; border: 0; border-radius: 4px; background: transparent; color: #748073; font: inherit; font-size: 11px; text-align: left; cursor: pointer; }
.admin-sidebar > button:hover, .admin-sidebar > button.tab-active { background: #edf2e8; color: #28523a; }
.admin-sidebar > button.tab-active { font-weight: 600; }
.tab-icon { width: 17px; color: #78906a; font-size: 15px; text-align: center; }
.sidebar-note { position: absolute; right: 24px; bottom: 29px; left: 26px; padding-top: 15px; border-top: 1px solid #e9ece4; color: #a0a699; font-family: Georgia, serif; font-size: 12px; font-style: italic; line-height: 1.7; }
.admin-content { min-width: 0; padding: 38px clamp(22px, 4vw, 58px) 60px; }
.admin-page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 28px; }
.admin-page-heading h1 { margin: 8px 0 5px; color: #294435; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(27px, 3vw, 36px); font-weight: 400; letter-spacing: -.8px; }
.admin-page-heading p { margin: 0; color: #858e80; font-size: 11px; }
.date-chip { flex: 0 0 auto; padding: 8px 10px; border: 1px solid #e5e9df; border-radius: 4px; color: #788273; font-size: 9px; }
.admin-message { margin: 0 0 18px; padding: 10px 13px; border-radius: 4px; font-size: 11px; }
.admin-message-success { background: #eaf3e4; color: #426b3e; }
.admin-message-error { background: #fff0ed; color: #a33b2c; }
.loading-note, .empty-note { padding: 24px 0; color: #899184; font-size: 11px; }
.admin-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin-bottom: 20px; }
.stat-card { position: relative; display: flex; min-height: 119px; overflow: hidden; flex-direction: column; gap: 9px; padding: 17px; border: 1px solid #e6e9e0; border-radius: 5px; background: #fff; }
.wallet-stat { border-color: #dce5d2; background: #eef3e8; }
.stat-label { color: #829077; font-size: 8px; font-weight: 700; letter-spacing: 1.1px; }
.stat-card strong { color: #304b37; font-family: Georgia, serif; font-size: 25px; font-weight: 500; }
.stat-caption { color: #90978c; font-size: 9px; }
.stat-decoration { position: absolute; right: 10px; bottom: -19px; color: rgba(100,130,82,.12); font-size: 74px; }
.admin-panel { margin-bottom: 18px; padding: 20px; border: 1px solid #e6e9e0; border-radius: 5px; background: #fff; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 15px; }
.panel-heading h2 { margin: 5px 0 0; color: #304b37; font-family: Georgia, serif; font-size: 21px; font-weight: 400; }
.primary-action { border-color: #174e3b; background: #174e3b; color: #fff; }
.primary-action:hover { background: #246548; }
.primary-action:disabled { cursor: wait; opacity: .7; }
.admin-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; padding: 15px; border: 1px solid #e8ebe2; border-radius: 4px; background: #fafbf8; }
.admin-form label { display: flex; min-width: 0; flex-direction: column; gap: 6px; color: #566450; font-size: 9px; font-weight: 600; }
.admin-form label > span { color: #899184; font-size: 8px; font-weight: 400; }
.admin-form input, .admin-form select, .admin-form textarea { width: 100%; min-height: 36px; padding: 8px 10px; border: 1px solid #e2e6dd; border-radius: 3px; background: #fff; color: #344539; font: inherit; font-size: 10px; }
.admin-form .photo-file-input { min-height: auto; padding: 8px; }
.admin-form .photo-help { color: #899184; font-size: 8px; font-weight: 400; }
.admin-form .photo-error { color: #a63d30; font-size: 9px; }
.photo-preview-list { display: flex; flex-wrap: wrap; gap: 8px; }
.photo-preview { position: relative; display: block; width: 62px; height: 62px; }
.photo-preview img { width: 100%; height: 100%; border-radius: 3px; object-fit: cover; }
.photo-preview button { position: absolute; top: 2px; right: 2px; display: grid; width: 18px; height: 18px; place-items: center; padding: 0; border: 0; border-radius: 50%; background: rgba(31, 45, 35, .85); color: #fff; font-size: 14px; cursor: pointer; }
.admin-form textarea { resize: vertical; }
.admin-form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.admin-form-row:has(select) { grid-template-columns: 1.4fr 1fr .7fr; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { padding: 10px 9px; border-bottom: 1px solid #e9ece4; color: #929a8f; font-size: 8px; font-weight: 700; letter-spacing: .75px; white-space: nowrap; }
td { padding: 11px 9px; border-bottom: 1px solid #f0f1ec; color: #727d70; font-size: 10px; }
tbody tr:last-child td { border-bottom: 0; }
td strong { color: #3a4b3c; font-weight: 600; }
td small { display: block; margin-top: 4px; color: #92998e; font-size: 8px; }
.table-subline { white-space: nowrap; }
.product-cell { display: flex; min-width: 185px; align-items: center; gap: 9px; }
.product-cell img { width: 36px; height: 36px; border-radius: 3px; background: #eef0e9; object-fit: cover; }
.status-chip { display: inline-block; padding: 4px 7px; border-radius: 20px; background: #edf4e9; color: #587d4d; font-size: 8px; }
.status-inactive { background: #f1f1ed; color: #93988e; }
.admin-chip { background: #e8eef5; color: #536e88; }
.delete-action { padding: 5px 7px; border: 0; border-radius: 3px; background: transparent; color: #a75b4f; font: inherit; font-size: 9px; cursor: pointer; }
.delete-action:hover { background: #fff0ed; }
.admin-page button:focus-visible, .admin-page input:focus-visible, .admin-page select:focus-visible, .admin-page textarea:focus-visible { outline: 2px solid #779469; outline-offset: 2px; }
@media (max-width: 900px) { .admin-layout { grid-template-columns: 175px minmax(0, 1fr); } .admin-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .admin-header { padding: 0 22px; } }
@media (max-width: 620px) { .admin-header { height: 62px; padding: 0 14px; } .admin-brand { font-size: 16px; } .store-button, .logout-button { min-height: 33px; padding: 0 9px; font-size: 9px; } .admin-layout { display: block; min-height: calc(100vh - 62px); } .admin-sidebar { position: sticky; z-index: 5; top: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 7px 8px; border-right: 0; border-bottom: 1px solid #e8ebe2; } .sidebar-label, .sidebar-note { display: none; } .admin-sidebar > button { min-height: 37px; justify-content: center; gap: 5px; padding: 0 5px; font-size: 8px; } .tab-icon { width: auto; } .admin-content { padding: 24px 14px 40px; } .admin-page-heading { align-items: flex-start; flex-direction: column; margin-bottom: 18px; } .admin-page-heading h1 { font-size: 29px; } .admin-stats { gap: 8px; } .stat-card { min-height: 105px; padding: 12px; } .stat-card strong { font-size: 21px; } .stat-caption { font-size: 8px; } .admin-panel { padding: 13px; } .admin-form-row, .admin-form-row:has(select) { grid-template-columns: 1fr; gap: 10px; } .panel-heading h2 { font-size: 19px; } }
</style>
