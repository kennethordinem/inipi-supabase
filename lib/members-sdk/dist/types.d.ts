/**
 * Type definitions for Clinio Members SDK
 */
import { FirebaseApp } from 'firebase/app';
import { User } from 'firebase/auth';
export interface ClinioMembersConfig {
    uniqueId: string;
    firebaseApp: FirebaseApp;
    environment?: 'production' | 'development';
}
export interface ClinicConfig {
    clinicId: string;
    clinicName: string;
    currency?: string;
    stripePublicKey?: string;
    companyInfo?: {
        email: string;
        phone: string;
        cvr: string;
        address: {
            street: string;
            city: string;
            zipCode: string;
            country: string;
        } | null;
    };
    branding?: {
        portalName: string;
        primaryColor: string;
        logoUrl?: string;
    };
    terminology?: {
        member: string;
        memberPlural: string;
        appointment: string;
        appointmentPlural: string;
        employee: string;
        employeePlural: string;
    };
    bookingWindow?: {
        enabled: boolean;
        weeks: number;
    };
}
export interface GroupType {
    id: string;
    name: string;
    description?: string;
    color: string;
    status: string;
}
export interface SessionTheme {
    id: string;
    name: string;
    color: string;
}
export interface Session {
    id: string;
    name: string;
    description?: string;
    date: string;
    time: string;
    duration: number;
    maxParticipants: number;
    currentParticipants: number;
    availableSpots: number;
    groupTypeId: string;
    groupTypeName: string;
    groupTypeColor: string;
    employeeIds: string[];
    employeeNames: string[];
    price?: number;
    location?: string;
    themes?: SessionTheme[];
    status?: string;
    maxSpotsPerBooking?: number;
}
export interface SessionsResponse {
    sessions: Session[];
    count: number;
}
export interface Booking {
    id: string;
    date: string;
    time: string;
    duration: number;
    type: string;
    status: string;
    paymentStatus: string;
    price: number;
    spots?: number;
    location?: string;
    employeeName?: string;
    color?: string;
}
export interface BookingsResponse {
    upcoming: Booking[];
    past: Booking[];
}
export interface BookSessionParams {
    sessionId: string;
    spots: number;
    themeId?: string;
    paymentMethod: 'stripe' | 'vipps' | 'punch_card' | 'manual';
    punchCardId?: string;
    paymentIntentId?: string;
    transactionId?: string;
}
export interface BookingResult {
    success: boolean;
    appointmentId: string;
    confirmationNumber: string;
    requiresPayment: boolean;
    paymentAmount?: number;
    paymentUrl?: string;
}
export interface CancelResult {
    success: boolean;
    punchCardRestored?: boolean;
    punchCardCreated?: boolean;
    newPunchCardId?: string;
    message?: string;
    refundAmount?: number;
}
export interface PunchCard {
    id: string;
    name: string;
    totalPunches: number;
    remainingPunches: number;
    validForGroupTypes: string[];
    expiryDate?: string;
    status: string;
}
export interface PunchCardsResponse {
    punchCards: PunchCard[];
}
export interface PunchCardUsageEntry {
    id: string;
    type: 'usage';
    sessionId: string;
    sessionName: string;
    sessionDate: string;
    sessionTime: string;
    spotsUsed: number;
    usedAt: string;
    remainingPunchesAfter: number;
}
export interface PunchCardAdjustmentEntry {
    id: string;
    type: 'adjustment';
    adjustmentType: 'add' | 'deduct';
    amount: number;
    reason: string;
    adjustedTypeName: string | null;
    adjustedTypeCategory: string | null;
    adjustedAt: string;
    newRemaining: number;
    previousRemaining: number;
}
export type PunchCardHistoryEntry = PunchCardUsageEntry | PunchCardAdjustmentEntry;
export interface PunchCardWithHistory extends PunchCard {
    purchaseDate: string;
    price: number;
    usageHistory: PunchCardHistoryEntry[];
}
export interface PunchCardHistoryResponse {
    punchCards: PunchCardWithHistory[];
}
export interface MemberProfile {
    id: string;
    rootPatientId?: string;
    clinicId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    memberSince: string | null;
}
export interface Payment {
    id: string;
    date: string | null;
    amount: number;
    description: string;
    status: string;
    method: string;
}
export interface PaymentHistoryResponse {
    payments: Payment[];
}
export interface EmployeeCheckResponse {
    isEmployee: boolean;
    employeeId?: string;
    employeeName?: string;
    points?: number;
    frontendPermissions?: {
        gusmester: boolean;
        staff: boolean;
        administration: boolean;
    };
}
export interface EmployeeStats {
    employeeId: string;
    points: number;
    pointsHistory: PointHistoryEntry[];
}
export interface PointHistoryEntry {
    amount: number;
    reason: string;
    timestamp: any;
    relatedSessionId?: string;
}
export interface GusmesterSpot {
    id: string;
    name: string;
    date: string;
    time: string;
    duration: number;
    location?: string;
    hostName: string;
    pointCost: number;
}
export interface GusmesterBooking {
    id: string;
    name: string;
    date: string;
    time: string;
    duration: number;
    location?: string;
    hostName: string;
    bookedAt?: string;
    canCancel: boolean;
    hoursUntilEvent: number;
}
export interface HostingSession {
    id: string;
    name: string;
    date: string;
    time: string;
    duration: number;
    location?: string;
    guestSpotStatus: 'reserved_for_host' | 'booked_by_host' | 'released_to_public';
    guestName?: string;
    guestEmail?: string;
    canRelease: boolean;
    canBookGuest: boolean;
    willEarnPoints: boolean;
    hoursUntilEvent: number;
}
export interface AvailableGusmesterSpotsResponse {
    spots: GusmesterSpot[];
}
export interface MyGusmesterBookingsResponse {
    bookings: GusmesterBooking[];
}
export interface MyHostingSessionsResponse {
    sessions: HostingSession[];
}
export interface BookGusmesterSpotResult {
    success: boolean;
    newPoints: number;
}
export interface CancelGusmesterBookingResult {
    success: boolean;
    newPoints: number;
}
export interface ReleaseGuestSpotResult {
    success: boolean;
    earnedPoints: boolean;
    newPoints: number;
}
export interface BookGuestResult {
    success: boolean;
    guestName: string;
}
export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    imageUrl?: string;
    inStock: boolean;
}
export interface ProductsResponse {
    products: Product[];
}
export interface RegisterParams {
    email: string;
    password: string;
    name: string;
    phone?: string;
}
export interface RegisterResult {
    success: boolean;
    userId: string;
    patientId: string;
}
export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
export declare class ClinioError extends Error {
    code: string;
    details?: any;
    constructor(message: string, code: string, details?: any);
}
export type AuthStateChangeCallback = (state: AuthState) => void;
export type UnsubscribeFunction = () => void;
export interface StaffSessionParticipant {
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    spots: number;
    bookedAt: string | null;
    paymentStatus: string;
    paymentMethod: string;
    paymentAmount?: number;
    selectedThemeId?: string | null;
    punchCardId?: string | null;
    isGuest: boolean;
}
export interface StaffSession extends Session {
    participants: StaffSessionParticipant[];
    reservedSpots: any | null;
}
export interface StaffSessionsResponse {
    sessions: StaffSession[];
    count: number;
}
export interface StaffSessionParticipantsResponse {
    sessionId: string;
    sessionName: string;
    sessionDate: string;
    sessionTime: string;
    participants: StaffSessionParticipant[];
    totalParticipants: number;
    totalSpots: number;
}
export interface AdminMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    memberSince: string | null;
    activeBookings: number;
    totalBookings: number;
}
export interface AdminMembersResponse {
    members: AdminMember[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface AdminBooking {
    id: string;
    appointmentId: string;
    sessionId: string | null;
    sessionName: string;
    groupTypeId: string | null;
    date: string;
    time: string;
    duration: number;
    spots: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    paymentAmount: number;
    location: string;
    color: string;
    punchCardId: string | null;
    createdAt: string | null;
}
export interface AdminPunchCard {
    id: string;
    name: string;
    totalPunches: number;
    remainingPunches: number;
    groupTypes: string[];
    purchaseDate: string | null;
    price: number;
}
export interface AdminMemberDetails {
    member: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        cpr: string;
        address: any;
        memberSince: string | null;
        status: string;
    };
    upcomingBookings: AdminBooking[];
    pastBookings: AdminBooking[];
    punchCards: AdminPunchCard[];
    stats: {
        totalBookings: number;
        upcomingBookings: number;
        completedBookings: number;
        cancelledBookings: number;
        activePunchCards: number;
        totalPunchesRemaining: number;
    };
}
export interface AdminCancelBookingResponse {
    success: boolean;
    punchCardRestored: boolean;
    punchCardCreated: boolean;
    newPunchCardId: string | null;
    isPastAppointment: boolean;
    message: string;
}
export interface AdminMoveBookingResponse {
    success: boolean;
    message: string;
    oldSession: {
        id: string;
        name: string;
        date: string | null;
    };
    newSession: {
        id: string;
        name: string;
        date: string;
        time: string;
    };
}
