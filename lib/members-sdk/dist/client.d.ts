/**
 * Main Clinio Members SDK Client
 */
import { User } from 'firebase/auth';
import { ClinioMembersConfig, ClinicConfig, SessionsResponse, GroupType, Session, BookingsResponse, PunchCardsResponse, MemberProfile, PaymentHistoryResponse, ProductsResponse, BookSessionParams, BookingResult, CancelResult, RegisterParams, RegisterResult, AuthState, AuthStateChangeCallback, UnsubscribeFunction } from './types';
export declare class ClinioMembers {
    private uniqueId;
    private firebaseApp;
    private auth;
    private functions;
    private authStateCallbacks;
    private currentAuthState;
    constructor(config: ClinioMembersConfig);
    private initAuthStateListener;
    /**
     * Login with email and password
     */
    login(email: string, password: string): Promise<User>;
    /**
     * Register a new member
     */
    register(params: RegisterParams): Promise<RegisterResult>;
    /**
     * Logout current user
     */
    logout(): Promise<void>;
    /**
     * Get current user
     */
    getCurrentUser(): User | null;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Get current auth state
     */
    getAuthState(): AuthState;
    /**
     * Subscribe to auth state changes
     */
    onAuthStateChanged(callback: AuthStateChangeCallback): UnsubscribeFunction;
    /**
     * Get clinic configuration
     */
    getConfig(): Promise<ClinicConfig>;
    /**
     * Get available classes/sessions
     */
    getClasses(filters?: {
        typeFilter?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<SessionsResponse>;
    /**
     * Get group types for filtering
     */
    getGroupTypes(): Promise<GroupType[]>;
    /**
     * Get session details
     */
    getSessionDetails(sessionId: string): Promise<Session>;
    /**
     * Get shop products
     */
    getProducts(category?: string): Promise<ProductsResponse>;
    /**
     * Get my bookings
     */
    getMyBookings(includeHistory?: boolean): Promise<BookingsResponse>;
    /**
     * Get shop punch cards available for purchase
     *
     * Returns punch cards that can be bought online.
     * No authentication required.
     */
    getShopPunchCards(): Promise<{
        punchCards: Array<{
            id: string;
            name: string;
            description: string;
            numberOfPunches: number;
            price: number;
            validityMonths?: number | null;
            status: string;
            availableForOnlinePurchase: boolean;
        }>;
    }>;
    /**
     * Get my punch cards
     */
    getPunchCards(): Promise<PunchCardsResponse>;
    /**
     * Get punch card history (all punch cards with usage logs)
     *
     * Returns all punch cards (active, used, expired) with their usage history.
     * Requires authentication.
     */
    getPunchCardHistory(): Promise<import('./types').PunchCardHistoryResponse>;
    /**
     * Get my profile
     */
    getProfile(): Promise<MemberProfile>;
    /**
     * Update my profile
     */
    updateProfile(data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        address?: {
            street?: string;
            city?: string;
            postalCode?: string;
        };
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Fix member access (one-time migration for existing users)
     * Call this if you get "Patient not found in this clinic" errors
     */
    fixMemberAccess(): Promise<{
        success: boolean;
        message: string;
        alreadyExists?: boolean;
        patientId?: string;
    }>;
    /**
     * Get payment history
     */
    getPaymentHistory(limit?: number): Promise<PaymentHistoryResponse>;
    /**
     * Create a payment intent for shop purchases
     *
     * Creates a Stripe payment intent via the clinic's Connect account.
     * Requires authentication.
     */
    createPaymentIntent(params: {
        amount: number;
        metadata: Record<string, any>;
    }): Promise<{
        clientSecret: string;
        paymentIntentId: string;
        platformFee?: number;
    }>;
    /**
     * Book a session
     */
    bookSession(params: BookSessionParams): Promise<BookingResult>;
    /**
     * Cancel a booking
     */
    cancelBooking(appointmentId: string): Promise<CancelResult>;
    private requireAuth;
    private handleError;
    private getAuthErrorMessage;
    /**
     * Check if current user is an employee
     */
    checkIfEmployee(): Promise<import('./types').EmployeeCheckResponse>;
    /**
     * Get employee stats (points and history)
     */
    getEmployeeStats(): Promise<import('./types').EmployeeStats>;
    /**
     * Get available Gusmester spots
     */
    getAvailableGusmesterSpots(): Promise<import('./types').AvailableGusmesterSpotsResponse>;
    /**
     * Get my Gusmester bookings
     */
    getMyGusmesterBookings(): Promise<import('./types').MyGusmesterBookingsResponse>;
    /**
     * Book a Gusmester spot
     */
    bookGusmesterSpot(sessionId: string): Promise<import('./types').BookGusmesterSpotResult>;
    /**
     * Cancel a Gusmester booking
     */
    cancelGusmesterBooking(sessionId: string): Promise<import('./types').CancelGusmesterBookingResult>;
    /**
     * Get my hosting sessions
     */
    getMyHostingSessions(): Promise<import('./types').MyHostingSessionsResponse>;
    /**
     * Release guest spot to public
     */
    releaseGuestSpot(sessionId: string): Promise<import('./types').ReleaseGuestSpotResult>;
    /**
     * Book a guest for the guest spot
     */
    bookGuestForSession(sessionId: string, guestName: string, guestEmail: string, guestPhone?: string): Promise<import('./types').BookGuestResult>;
    /**
     * Get all sessions with participant details (staff only)
     *
     * Requires employee authentication.
     */
    getStaffSessions(filters?: {
        startDate?: string;
        endDate?: string;
    }): Promise<import('./types').StaffSessionsResponse>;
    /**
     * Get detailed participant list for a specific session (staff only)
     *
     * Requires employee authentication.
     */
    getStaffSessionParticipants(sessionId: string): Promise<import('./types').StaffSessionParticipantsResponse>;
    /**
     * Get all members/patients (admin only)
     *
     * Requires administration permission.
     */
    getAdminMembers(page?: number, limit?: number, searchQuery?: string): Promise<import('./types').AdminMembersResponse>;
    /**
     * Get detailed member information (admin only)
     *
     * Requires administration permission.
     */
    getAdminMemberDetails(memberId: string): Promise<import('./types').AdminMemberDetails>;
    /**
     * Cancel a member's booking and convert to punch card (admin only)
     *
     * Requires administration permission.
     */
    adminCancelBooking(memberId: string, appointmentId: string, reason: string): Promise<import('./types').AdminCancelBookingResponse>;
    /**
     * Move a member's booking to another session (admin only)
     *
     * Requires administration permission.
     */
    adminMoveBooking(memberId: string, appointmentId: string, newSessionId: string, reason: string): Promise<import('./types').AdminMoveBookingResponse>;
}
