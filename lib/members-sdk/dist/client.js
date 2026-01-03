"use strict";
/**
 * Main Clinio Members SDK Client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinioMembers = void 0;
const auth_1 = require("firebase/auth");
const functions_1 = require("firebase/functions");
const types_1 = require("./types");
class ClinioMembers {
    constructor(config) {
        this.authStateCallbacks = new Set();
        this.currentAuthState = {
            user: null,
            isAuthenticated: false,
            isLoading: true
        };
        this.uniqueId = config.uniqueId;
        this.firebaseApp = config.firebaseApp;
        this.auth = (0, auth_1.getAuth)(this.firebaseApp);
        // Initialize Firebase Functions with europe-west1 region
        this.functions = (0, functions_1.getFunctions)(this.firebaseApp, 'europe-west1');
        // Setup auth state listener
        this.initAuthStateListener();
    }
    // ============================================
    // Authentication Methods
    // ============================================
    initAuthStateListener() {
        (0, auth_1.onAuthStateChanged)(this.auth, (user) => {
            this.currentAuthState = {
                user,
                isAuthenticated: !!user,
                isLoading: false
            };
            // Notify all callbacks
            this.authStateCallbacks.forEach(callback => {
                callback(this.currentAuthState);
            });
        });
    }
    /**
     * Login with email and password
     */
    async login(email, password) {
        try {
            const userCredential = await (0, auth_1.signInWithEmailAndPassword)(this.auth, email, password);
            return userCredential.user;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Register a new member
     */
    async register(params) {
        try {
            const registerFn = (0, functions_1.httpsCallable)(this.functions, 'membersRegister');
            const result = await registerFn({
                uniqueId: this.uniqueId,
                ...params
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Logout current user
     */
    async logout() {
        try {
            await (0, auth_1.signOut)(this.auth);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.auth.currentUser;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentAuthState.isAuthenticated;
    }
    /**
     * Get current auth state
     */
    getAuthState() {
        return { ...this.currentAuthState };
    }
    /**
     * Subscribe to auth state changes
     */
    onAuthStateChanged(callback) {
        this.authStateCallbacks.add(callback);
        // Immediately call with current state
        callback(this.currentAuthState);
        // Return unsubscribe function
        return () => {
            this.authStateCallbacks.delete(callback);
        };
    }
    // ============================================
    // Public Methods (No Auth Required)
    // ============================================
    /**
     * Get clinic configuration
     */
    async getConfig() {
        try {
            const getConfigFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersConfig');
            const result = await getConfigFn({ uniqueId: this.uniqueId });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get available classes/sessions
     */
    async getClasses(filters) {
        try {
            const getClassesFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersClasses');
            const result = await getClassesFn({
                uniqueId: this.uniqueId,
                ...filters
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get group types for filtering
     */
    async getGroupTypes() {
        try {
            const getGroupTypesFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersGroupTypes');
            const result = await getGroupTypesFn({ uniqueId: this.uniqueId });
            return result.data.groupTypes;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get session details
     */
    async getSessionDetails(sessionId) {
        try {
            const getSessionFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersSessionDetails');
            const result = await getSessionFn({
                uniqueId: this.uniqueId,
                sessionId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get shop products
     */
    async getProducts(category) {
        try {
            const getProductsFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersShopProducts');
            const result = await getProductsFn({
                uniqueId: this.uniqueId,
                category
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    // ============================================
    // Authenticated Methods
    // ============================================
    /**
     * Get my bookings
     */
    async getMyBookings(includeHistory = false) {
        this.requireAuth();
        try {
            const getBookingsFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersMyBookings');
            const result = await getBookingsFn({
                uniqueId: this.uniqueId,
                includeHistory
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get shop punch cards available for purchase
     *
     * Returns punch cards that can be bought online.
     * No authentication required.
     */
    async getShopPunchCards() {
        try {
            const getShopPunchCardsFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersShopPunchCards');
            const result = await getShopPunchCardsFn({ uniqueId: this.uniqueId });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get my punch cards
     */
    async getPunchCards() {
        this.requireAuth();
        try {
            const getPunchCardsFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersPunchCards');
            const result = await getPunchCardsFn({ uniqueId: this.uniqueId });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get punch card history (all punch cards with usage logs)
     *
     * Returns all punch cards (active, used, expired) with their usage history.
     * Requires authentication.
     */
    async getPunchCardHistory() {
        this.requireAuth();
        try {
            const getHistoryFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersPunchCardHistory');
            const result = await getHistoryFn({ uniqueId: this.uniqueId });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get my profile
     */
    async getProfile() {
        this.requireAuth();
        try {
            const getProfileFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersProfile');
            const result = await getProfileFn({ uniqueId: this.uniqueId });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Update my profile
     */
    async updateProfile(data) {
        this.requireAuth();
        try {
            const updateProfileFn = (0, functions_1.httpsCallable)(this.functions, 'updateMembersProfile');
            const result = await updateProfileFn({
                uniqueId: this.uniqueId,
                ...data
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Fix member access (one-time migration for existing users)
     * Call this if you get "Patient not found in this clinic" errors
     */
    async fixMemberAccess() {
        this.requireAuth();
        try {
            const fixAccessFn = (0, functions_1.httpsCallable)(this.functions, 'fixMemberAccess');
            const result = await fixAccessFn({
                uniqueId: this.uniqueId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get payment history
     */
    async getPaymentHistory(limit) {
        this.requireAuth();
        try {
            const getPaymentsFn = (0, functions_1.httpsCallable)(this.functions, 'getMembersPaymentHistory');
            const result = await getPaymentsFn({
                uniqueId: this.uniqueId,
                limit
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Create a payment intent for shop purchases
     *
     * Creates a Stripe payment intent via the clinic's Connect account.
     * Requires authentication.
     */
    async createPaymentIntent(params) {
        this.requireAuth();
        try {
            // Get clinic ID first
            const profile = await this.getProfile();
            if (!profile || !profile.clinicId) {
                throw new types_1.ClinioError('Could not determine clinic ID', 'invalid-state');
            }
            const createPaymentFn = (0, functions_1.httpsCallable)(this.functions, 'createConnectPaymentIntent');
            const result = await createPaymentFn({
                amount: params.amount,
                clinicId: profile.clinicId,
                customerMetadata: {
                    ...params.metadata,
                    uniqueId: this.uniqueId
                }
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Book a session
     */
    async bookSession(params) {
        this.requireAuth();
        try {
            const bookSessionFn = (0, functions_1.httpsCallable)(this.functions, 'memberBookSession');
            const result = await bookSessionFn({
                uniqueId: this.uniqueId,
                ...params
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Cancel a booking
     */
    async cancelBooking(appointmentId) {
        this.requireAuth();
        try {
            const cancelBookingFn = (0, functions_1.httpsCallable)(this.functions, 'memberCancelBooking');
            const result = await cancelBookingFn({
                uniqueId: this.uniqueId,
                appointmentId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    // ============================================
    // Helper Methods
    // ============================================
    requireAuth() {
        if (!this.isAuthenticated()) {
            throw new types_1.ClinioError('Authentication required', 'auth/unauthenticated');
        }
    }
    handleError(error) {
        // Handle Firebase Auth errors
        if (error.code?.startsWith('auth/')) {
            return new types_1.ClinioError(this.getAuthErrorMessage(error.code), error.code);
        }
        // Handle Firebase Functions errors
        if (error.code && error.message) {
            return new types_1.ClinioError(error.message, error.code, error.details);
        }
        // Generic error
        return new types_1.ClinioError(error.message || 'An unexpected error occurred', 'unknown', error);
    }
    getAuthErrorMessage(code) {
        const messages = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password is too weak',
            'auth/invalid-credential': 'Invalid login credentials',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection',
        };
        return messages[code] || 'Authentication error';
    }
    // ============================================
    // Employee Booking (Gusmester) Methods
    // ============================================
    /**
     * Check if current user is an employee
     */
    async checkIfEmployee() {
        this.requireAuth();
        try {
            const checkFn = (0, functions_1.httpsCallable)(this.functions, 'checkIfMemberIsEmployee');
            const result = await checkFn({
                uniqueId: this.uniqueId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get employee stats (points and history)
     */
    async getEmployeeStats() {
        this.requireAuth();
        try {
            const getStatsFn = (0, functions_1.httpsCallable)(this.functions, 'getEmployeeStats');
            const result = await getStatsFn({
                uniqueId: this.uniqueId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get available Gusmester spots
     */
    async getAvailableGusmesterSpots() {
        this.requireAuth();
        try {
            const getSpotsFn = (0, functions_1.httpsCallable)(this.functions, 'getAvailableGusmesterSpots');
            const result = await getSpotsFn({
                uniqueId: this.uniqueId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get my Gusmester bookings
     */
    async getMyGusmesterBookings() {
        this.requireAuth();
        try {
            const getBookingsFn = (0, functions_1.httpsCallable)(this.functions, 'getMyGusmesterBookings');
            const result = await getBookingsFn({
                uniqueId: this.uniqueId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Book a Gusmester spot
     */
    async bookGusmesterSpot(sessionId) {
        this.requireAuth();
        try {
            const bookFn = (0, functions_1.httpsCallable)(this.functions, 'bookGusmesterSpot');
            const result = await bookFn({
                uniqueId: this.uniqueId,
                sessionId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Cancel a Gusmester booking
     */
    async cancelGusmesterBooking(sessionId) {
        this.requireAuth();
        try {
            const cancelFn = (0, functions_1.httpsCallable)(this.functions, 'cancelGusmesterBooking');
            const result = await cancelFn({
                uniqueId: this.uniqueId,
                sessionId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get my hosting sessions
     */
    async getMyHostingSessions() {
        this.requireAuth();
        try {
            const getSessionsFn = (0, functions_1.httpsCallable)(this.functions, 'getMyHostingSessions');
            const result = await getSessionsFn({
                uniqueId: this.uniqueId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Release guest spot to public
     */
    async releaseGuestSpot(sessionId) {
        this.requireAuth();
        try {
            const releaseFn = (0, functions_1.httpsCallable)(this.functions, 'releaseGuestSpot');
            const result = await releaseFn({
                uniqueId: this.uniqueId,
                sessionId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Book a guest for the guest spot
     */
    async bookGuestForSession(sessionId, guestName, guestEmail, guestPhone) {
        this.requireAuth();
        try {
            const bookGuestFn = (0, functions_1.httpsCallable)(this.functions, 'bookGuestForSession');
            const result = await bookGuestFn({
                uniqueId: this.uniqueId,
                sessionId,
                guestName,
                guestEmail,
                guestPhone
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    // ============================================
    // Staff Management Methods
    // ============================================
    /**
     * Get all sessions with participant details (staff only)
     *
     * Requires employee authentication.
     */
    async getStaffSessions(filters) {
        this.requireAuth();
        try {
            const getSessionsFn = (0, functions_1.httpsCallable)(this.functions, 'getStaffSessions');
            const result = await getSessionsFn({
                uniqueId: this.uniqueId,
                ...filters
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get detailed participant list for a specific session (staff only)
     *
     * Requires employee authentication.
     */
    async getStaffSessionParticipants(sessionId) {
        this.requireAuth();
        try {
            const getParticipantsFn = (0, functions_1.httpsCallable)(this.functions, 'getStaffSessionParticipants');
            const result = await getParticipantsFn({
                uniqueId: this.uniqueId,
                sessionId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    // ============================================
    // Administration Methods
    // ============================================
    /**
     * Get all members/patients (admin only)
     *
     * Requires administration permission.
     */
    async getAdminMembers(page = 1, limit = 50, searchQuery = '') {
        this.requireAuth();
        try {
            const getMembersFn = (0, functions_1.httpsCallable)(this.functions, 'getAdminMembers');
            const result = await getMembersFn({
                uniqueId: this.uniqueId,
                page,
                limit,
                searchQuery
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Get detailed member information (admin only)
     *
     * Requires administration permission.
     */
    async getAdminMemberDetails(memberId) {
        this.requireAuth();
        try {
            const getMemberDetailsFn = (0, functions_1.httpsCallable)(this.functions, 'getAdminMemberDetails');
            const result = await getMemberDetailsFn({
                uniqueId: this.uniqueId,
                memberId
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Cancel a member's booking and convert to punch card (admin only)
     *
     * Requires administration permission.
     */
    async adminCancelBooking(memberId, appointmentId, reason) {
        this.requireAuth();
        try {
            const cancelBookingFn = (0, functions_1.httpsCallable)(this.functions, 'adminCancelBooking');
            const result = await cancelBookingFn({
                uniqueId: this.uniqueId,
                memberId,
                appointmentId,
                reason
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    /**
     * Move a member's booking to another session (admin only)
     *
     * Requires administration permission.
     */
    async adminMoveBooking(memberId, appointmentId, newSessionId, reason) {
        this.requireAuth();
        try {
            const moveBookingFn = (0, functions_1.httpsCallable)(this.functions, 'adminMoveBooking');
            const result = await moveBookingFn({
                uniqueId: this.uniqueId,
                memberId,
                appointmentId,
                newSessionId,
                reason
            });
            return result.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
}
exports.ClinioMembers = ClinioMembers;
