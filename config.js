/* AetherLab public client configuration. Keep passwords and private API secrets out of this file. */
const AETHER_CONFIG = Object.freeze({
    adminEmail: 'denisbiletskiy0@gmail.com',
    firebase: {
        apiKey: 'AIzaSyDMYBcqeFYN5esiJWU3uOwpSF3lpJ1YsoM',
        authDomain: 'kite-df7f4.firebaseapp.com',
        databaseURL: 'https://kite-df7f4-default-rtdb.europe-west1.firebasedatabase.app',
        projectId: 'kite-df7f4',
        storageBucket: 'kite-df7f4.firebasestorage.app',
        messagingSenderId: '862575962733',
        appId: '1:862575962733:web:de9ecde7b7ba4c41e66d64',
        measurementId: 'G-BVCC4Y916Y'
    },
    emailjs: { publicKey: 'R-MbAs_m2hjNl4p7W', serviceId: 'service_z6is65e', templateId: 'template_51w35gn' },
    cloudinary: { cloudName: 'didulpof7', uploadPreset: 'kite_unsigned' }
});
const ADMIN_EMAIL = AETHER_CONFIG.adminEmail;
const CLOUDINARY_CLOUD_NAME = AETHER_CONFIG.cloudinary.cloudName;
const CLOUDINARY_UPLOAD_PRESET = AETHER_CONFIG.cloudinary.uploadPreset;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
