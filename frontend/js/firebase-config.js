/**
 * Firebase Authentication Configuration & Helper.
 * Auto-normalizes 127.0.0.1 to localhost so Firebase OAuth domain check passes.
 */
if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
  window.location.replace(window.location.href.replace('://127.0.0.1', '://localhost'));
}

const firebaseConfig = {
  apiKey: "AIzaSyA5m--nLmvJH5iSP_4ia2VJz67BB8N5uvA",
  authDomain: "safe-kin.firebaseapp.com",
  projectId: "safe-kin",
  storageBucket: "safe-kin.firebasestorage.app",
  messagingSenderId: "24103812293",
  appId: "1:24103812293:web:29175a8f32ec44b5b484ac",
  measurementId: "G-94NJNC41PF"
};

class FirebaseAuthService {
  constructor() {
    this.auth = null;
    this.isReady = false;
    this.init();
  }

  init() {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        if (firebase.firestore) {
          this.db = firebase.firestore();
        }
        this.isReady = true;
      } catch (err) {
        console.warn('Firebase init warning:', err.message);
      }
    }
  }

  isConfigured() {
    return this.isReady && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('Placeholder');
  }

  /**
   * 1-Click Google Sign-In: 100% verified original email (no fake emails).
   */
  async signInWithGoogle() {
    if (!this.isConfigured()) {
      throw new Error(
        "Firebase is not configured with your project keys yet. Open 'frontend/js/firebase-config.js' and add your Firebase API key from Firebase Console."
      );
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    const result = await this.auth.signInWithPopup(provider);
    const user = result.user;
    const idToken = await user.getIdToken(true);

    return {
      idToken,
      email: user.email,
      fullName: user.displayName || user.email.split('@')[0],
      avatarUrl: user.photoURL || null,
      emailVerified: user.emailVerified
    };
  }

  /**
   * Email/Password Signup with MANDATORY Email Verification.
   * Sends verification link to email to ensure original/real email only.
   */
  async signUpWithVerifiedEmail(email, password, fullName) {
    if (!this.isConfigured()) {
      throw new Error(
        "Firebase is not configured with your project keys yet. Open 'frontend/js/firebase-config.js' and add your Firebase API key from Firebase Console."
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const userCredential = await this.auth.createUserWithEmailAndPassword(cleanEmail, password);
    const user = userCredential.user;

    if (fullName) {
      await user.updateProfile({ displayName: fullName.trim() });
    }

    // Send verification email link
    await user.sendEmailVerification();
    
    // Sign out until verified
    await this.auth.signOut();

    return {
      email: cleanEmail,
      message: `Verification link sent to ${cleanEmail}. Please check your inbox and verify your email before logging in!`
    };
  }

  /**
   * Email/Password Login with check for verified email.
   * Blocks unverified / fake emails.
   */
  async signInWithVerifiedEmail(email, password) {
    if (!this.isConfigured()) {
      throw new Error(
        "Firebase is not configured with your project keys yet. Open 'frontend/js/firebase-config.js' and add your Firebase API key from Firebase Console."
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const userCredential = await this.auth.signInWithEmailAndPassword(cleanEmail, password);
    const user = userCredential.user;

    // Reload user to get latest emailVerified status
    await user.reload();

    if (!user.emailVerified) {
      await this.auth.signOut();
      throw new Error(
        "Your email is NOT verified yet! We sent a verification link to your email. Please click it to confirm your original email before accessing FamLocator."
      );
    }

    const idToken = await user.getIdToken(true);

    return {
      idToken,
      email: user.email,
      fullName: user.displayName || user.email.split('@')[0],
      avatarUrl: user.photoURL || null,
      emailVerified: true
    };
  }

  /**
   * Save / Sync User Profile to Firebase Firestore Cloud
   */
  async saveUserToFirestore(userData) {
    if (!this.db || !userData) return;
    try {
      const email = userData.email || (this.auth && this.auth.currentUser ? this.auth.currentUser.email : null);
      if (!email) return;
      const cleanDocId = email.toLowerCase().replace(/[^a-z0-9_@.]/g, '_');
      await this.db.collection('users').doc(cleanDocId).set({
        id: userData.id || null,
        email: email,
        full_name: userData.full_name || '',
        username: userData.username || '',
        phone: userData.phone || null,
        avatar_url: userData.avatar_url || null,
        bio: userData.profile?.bio || null,
        blood_group: userData.profile?.blood_group || null,
        is_sharing: userData.is_sharing !== undefined ? userData.is_sharing : true,
        last_active: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore user sync:', err.message);
    }
  }

  /**
   * Save / Sync Live Location to Firebase Firestore Cloud
   */
  async saveLocationToFirestore(locData, user) {
    if (!this.db || !locData) return;
    try {
      const email = user?.email || (this.auth && this.auth.currentUser ? this.auth.currentUser.email : null);
      if (!email) return;
      const cleanDocId = email.toLowerCase().replace(/[^a-z0-9_@.]/g, '_');
      await this.db.collection('live_locations').doc(cleanDocId).set({
        user_email: email,
        user_name: user?.full_name || email.split('@')[0],
        avatar_url: user?.avatar_url || null,
        latitude: locData.latitude,
        longitude: locData.longitude,
        accuracy: locData.accuracy || 0,
        speed: locData.speed || 0,
        battery_level: locData.battery_level !== undefined ? locData.battery_level : null,
        is_sos: Boolean(locData.is_sos),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore location sync:', err.message);
    }
  }

  /**
   * Save Emergency SOS Alert to Firebase Firestore Cloud
   */
  async saveSOSToFirestore(sosData, user) {
    if (!this.db) return;
    try {
      const email = user?.email || (this.auth && this.auth.currentUser ? this.auth.currentUser.email : 'unknown');
      await this.db.collection('sos_alerts').add({
        user_email: email,
        user_name: user?.full_name || email,
        user_phone: user?.phone || null,
        latitude: sosData.latitude,
        longitude: sosData.longitude,
        battery_level: sosData.battery_level || null,
        status: 'active',
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore SOS sync:', err.message);
    }
  }
}

const firebaseAuth = new FirebaseAuthService();
window.firebaseAuth = firebaseAuth;
