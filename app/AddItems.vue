<script setup lang="ts">
type ListingCategory = 'Home & living' | 'Fashion' | 'Electronics' | 'Art & craft' | 'Food & drink'
type ListingDraft = {
  name: string
  category: ListingCategory
  price: number
  location: string
  seller: string
  image: string
  photos: File[]
}

const emit = defineEmits<{
  add: [listing: ListingDraft]
}>()

const categories: ListingCategory[] = ['Home & living', 'Fashion', 'Electronics', 'Art & craft', 'Food & drink']
const isOpen = ref(false)
const photoPreviews = ref<{ file: File, url: string }[]>([])
const photoError = ref('')
const form = reactive({
  name: '',
  category: 'Home & living' as ListingCategory,
  price: '',
  location: '',
  seller: '',
  image: ''
})

function handlePhotoSelection(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const files = Array.from(input.files ?? [])
  input.value = ''

  if (photoPreviews.value.length + files.length > 5) {
    photoError.value = 'Choose up to 5 photos.'
    return
  }

  const invalidFile = files.find(file => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)
  if (invalidFile) {
    photoError.value = invalidFile.size > 5 * 1024 * 1024
      ? 'Each photo must be 5 MB or smaller.'
      : 'Choose image files only.'
    return
  }

  photoError.value = ''
  photoPreviews.value.push(...files.map(file => ({ file, url: URL.createObjectURL(file) })))
}

function clearPhotoPreviews() {
  photoPreviews.value.forEach(photo => URL.revokeObjectURL(photo.url))
  photoPreviews.value = []
}

function removePhoto(index: number) {
  const [removedPhoto] = photoPreviews.value.splice(index, 1)
  if (removedPhoto) URL.revokeObjectURL(removedPhoto.url)
  photoError.value = ''
}

function closeForm() {
  isOpen.value = false
}

function submitListing() {
  emit('add', {
    name: form.name.trim(),
    category: form.category,
    price: Number(form.price),
    location: form.location.trim(),
    seller: form.seller.trim(),
    image: form.image.trim() || 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=85',
    photos: photoPreviews.value.map(photo => photo.file)
  })

  clearPhotoPreviews()
  photoError.value = ''
  Object.assign(form, {
    name: '',
    category: 'Home & living',
    price: '',
    location: '',
    seller: '',
    image: ''
  })
  closeForm()
}

onBeforeUnmount(clearPhotoPreviews)
</script>

<template>
  <article class="add-card">
    <button class="add-card-photo" type="button" aria-label="Add a new item for sale" @click="isOpen = true">
      <span class="add-card-orbit" aria-hidden="true" />
      <span class="add-card-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </span>
      <span class="add-card-message">Make room for<br>something good.</span>
      <span class="add-card-cta">ADD AN ITEM <span aria-hidden="true">↗</span></span>
    </button>
    <div class="add-card-details">
      <div class="add-card-heading">
        <h3>List your next find</h3>
        <span class="add-card-price">Your price</span>
      </div>
      <span class="add-card-seller">Have something lovely to sell?</span>
      <div class="add-card-meta">
        <span>YOUR SHOP, YOUR STORY</span>
        <span>Start here ↗</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="isOpen" class="modal-backdrop" @click.self="closeForm" @keydown.esc="closeForm">
        <section class="listing-dialog" role="dialog" aria-modal="true" aria-labelledby="add-listing-title">
          <button class="close-button" type="button" aria-label="Close form" @click="closeForm">×</button>
          <span class="dialog-eyebrow">A GOOD FIND STARTS HERE</span>
          <h2 id="add-listing-title">Add something lovely.</h2>
          <p class="dialog-intro">Tell shoppers a little about what you have to offer.</p>

          <form class="listing-form" @submit.prevent="submitListing">
            <label>
              Item name
              <input v-model="form.name" type="text" name="name" maxlength="100" placeholder="e.g. Handwoven market basket" required autofocus>
            </label>
            <div class="form-row">
              <label>
                Category
                <select v-model="form.category" name="category" required>
                  <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
                </select>
              </label>
              <label>
                Price (KSh)
                <input v-model="form.price" type="number" name="price" min="1" max="99999999" step="1" placeholder="1800" required>
              </label>
            </div>
            <label>
              Sale location
              <input v-model="form.location" type="text" name="location" maxlength="100" placeholder="e.g. Westlands, Nairobi" required>
            </label>
            <label>
              Seller or shop name
              <input v-model="form.seller" type="text" name="seller" maxlength="100" placeholder="e.g. Woven by Wanjiku" required>
            </label>
            <label>
              Product photos <span class="optional-label">OPTIONAL · UP TO 5</span>
              <input
                class="photo-file-input"
                type="file"
                name="photos"
                accept="image/*"
                multiple
                :disabled="photoPreviews.length >= 5"
                @change="handlePhotoSelection"
              >
              <span class="photo-help">
                {{ photoPreviews.length }} of 5 photos selected. Choose multiple at once or add more in another batch; each image can be up to 5 MB.
              </span>
              <span v-if="photoError" class="photo-error" role="alert">{{ photoError }}</span>
              <span v-if="photoPreviews.length" class="photo-preview-list" aria-label="Selected photo previews">
                <span v-for="(photo, index) in photoPreviews" :key="photo.url" class="photo-preview">
                  <img :src="photo.url" :alt="`Product photo ${index + 1}: ${photo.file.name}`">
                  <button type="button" :aria-label="`Remove photo ${index + 1}`" @click="removePhoto(index)">×</button>
                </span>
              </span>
            </label>
            <label>
              Or use a photo link <span class="optional-label">OPTIONAL</span>
              <input v-model="form.image" type="url" name="image" maxlength="500" placeholder="https://example.com/your-item.jpg">
            </label>
            <div class="form-actions">
              <button class="cancel-button" type="button" @click="closeForm">Cancel</button>
              <button class="submit-button" type="submit">Add to the good finds <span aria-hidden="true">↗</span></button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </article>
</template>

<style scoped>
.add-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.add-card-photo {
  position: relative;
  display: flex;
  height: clamp(170px, 20vw, 250px);
  overflow: hidden;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed #cbd4bf;
  border-radius: 3px;
  background: #f0f2e9;
  color: #355a40;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}

.add-card-photo:hover {
  border-color: #839b71;
  background: #e9eee0;
}

.add-card-orbit {
  position: absolute;
  top: -73px;
  right: -48px;
  width: 190px;
  height: 190px;
  border: 1px solid rgba(112, 137, 95, .15);
  border-radius: 50%;
}

.add-card-icon {
  z-index: 1;
  display: grid;
  width: 43px;
  height: 43px;
  place-items: center;
  border: 1px solid #d5ddc9;
  border-radius: 50%;
  background: rgba(251, 250, 246, .8);
  color: #55744c;
  transition: transform .2s;
}

.add-card-photo:hover .add-card-icon {
  transform: rotate(90deg);
}

.add-card-icon svg {
  width: 21px;
  height: 21px;
}

.add-card-message {
  color: #48604a;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15px;
  line-height: 1.25;
}

.add-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #7a8a6c;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
}

.add-card-details {
  flex: 1;
  padding: 12px 1px 0;
}

.add-card-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.add-card-heading h3 {
  overflow: hidden;
  margin: 0;
  color: #344539;
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-card-price {
  flex: 0 0 auto;
  color: #91a085;
  font-size: 9px;
  font-style: italic;
}

.add-card-seller {
  display: block;
  margin-top: 5px;
  color: #93988e;
  font-size: 9px;
}

.add-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  color: #73816d;
  font-size: 8px;
}

.add-card-meta span:last-child {
  color: #899583;
}

.modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  overflow-y: auto;
  place-items: center;
  padding: 24px;
  background: rgba(23, 45, 33, .54);
  backdrop-filter: blur(3px);
}

.listing-dialog {
  position: relative;
  width: min(100%, 500px);
  padding: 34px 38px 30px;
  border: 1px solid #e8e9df;
  border-radius: 7px;
  background: #fbfaf6;
  box-shadow: 0 24px 80px rgba(18, 37, 26, .25);
}

.close-button {
  position: absolute;
  top: 14px;
  right: 16px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #778273;
  font: inherit;
  font-size: 24px;
  cursor: pointer;
}

.close-button:hover {
  background: #eef0e8;
}

.dialog-eyebrow {
  color: #82916f;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.listing-dialog h2 {
  margin: 10px 0 6px;
  color: #294435;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 30px;
  font-weight: 400;
  letter-spacing: -.7px;
}

.dialog-intro {
  margin: 0 0 23px;
  color: #858b7f;
  font-size: 11px;
}

.listing-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.listing-form label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  color: #52604f;
  font-size: 10px;
  font-weight: 600;
}

.listing-form input,
.listing-form select {
  width: 100%;
  min-width: 0;
  height: 41px;
  padding: 0 11px;
  border: 1px solid #e2e5dc;
  border-radius: 4px;
  outline: 0;
  background: #fff;
  color: #334438;
  font: inherit;
  font-size: 11px;
  font-weight: 400;
}

.listing-form input::placeholder {
  color: #abb0a7;
}

.listing-form .photo-file-input {
  height: auto;
  min-height: 41px;
  padding: 8px;
  font-size: 10px;
}

.photo-help,
.photo-error {
  margin-top: -1px;
  color: #899184;
  font-size: 9px;
  font-weight: 400;
  line-height: 1.5;
}

.photo-error {
  color: #a33b2c;
}

.photo-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo-preview {
  position: relative;
  width: 62px;
  height: 62px;
  overflow: hidden;
  border: 1px solid #e2e5dc;
  border-radius: 4px;
  background: #eeede6;
}

.photo-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-preview button {
  position: absolute;
  top: 3px;
  right: 3px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(251, 250, 246, .95);
  color: #455843;
  font: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.listing-form input:focus,
.listing-form select:focus {
  border-color: #829b71;
  box-shadow: 0 0 0 3px rgba(113, 149, 105, .11);
}

.form-row {
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 13px;
}

.optional-label {
  color: #929b8b;
  font-size: 8px;
  font-weight: 500;
  letter-spacing: .7px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.cancel-button,
.submit-button {
  min-height: 40px;
  padding: 0 15px;
  border: 1px solid #dfe4d8;
  border-radius: 4px;
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.cancel-button {
  background: transparent;
  color: #657260;
}

.cancel-button:hover {
  background: #f1f2eb;
}

.submit-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  border-color: #174e3b;
  background: #174e3b;
  color: #fff;
}

.submit-button:hover {
  background: #246548;
}

.empty-add-card {
  width: min(100%, 260px);
  margin-top: 22px;
  text-align: left;
}

.add-card:focus-visible,
.add-card button:focus-visible,
.listing-dialog button:focus-visible,
.listing-dialog input:focus-visible,
.listing-dialog select:focus-visible {
  outline: 2px solid #779469;
  outline-offset: 3px;
}

@media (max-width: 900px) {
  .add-card-photo {
    height: clamp(200px, 34vw, 310px);
  }
}

@media (max-width: 620px) {
  .add-card-photo {
    height: clamp(155px, 47vw, 235px);
  }

  .add-card-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .add-card-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
    margin-top: 8px;
  }

  .listing-dialog {
    padding: 30px 21px 23px;
  }

  .listing-dialog h2 {
    font-size: 26px;
  }
}
</style>