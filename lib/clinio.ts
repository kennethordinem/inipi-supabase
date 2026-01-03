// This file must only be imported in client components
// All components using this should have 'use client' directive

let membersInstance: any = null;

function initMembers() {
  if (typeof window === 'undefined') {
    throw new Error('Clinio Members SDK can only be used on the client side');
  }
  
  if (!membersInstance) {
    const { ClinioMembers } = require('./members-sdk/dist/index');
    const { getFirebaseApp } = require('./firebase');
    
    membersInstance = new ClinioMembers({
      uniqueId: 'inipiamagerstrand',
      firebaseApp: getFirebaseApp()
    });
  }
  
  return membersInstance;
}

// Create members object that initializes on first use
export const members = {
  get isInitialized() {
    return membersInstance !== null;
  },
  
  login: (...args: any[]) => initMembers().login(...args),
  logout: (...args: any[]) => initMembers().logout(...args),
  register: (...args: any[]) => initMembers().register(...args),
  isAuthenticated: (...args: any[]) => initMembers().isAuthenticated(...args),
  getCurrentUser: (...args: any[]) => initMembers().getCurrentUser(...args),
  onAuthStateChanged: (...args: any[]) => initMembers().onAuthStateChanged(...args),
  
  getConfig: (...args: any[]) => initMembers().getConfig(...args),
  getClasses: (...args: any[]) => initMembers().getClasses(...args),
  getGroupTypes: (...args: any[]) => initMembers().getGroupTypes(...args),
  getSessionDetails: (...args: any[]) => initMembers().getSessionDetails(...args),
  getShopProducts: (...args: any[]) => initMembers().getShopProducts(...args),
  getShopPunchCards: (...args: any[]) => initMembers().getShopPunchCards(...args),
  
  getMyBookings: (...args: any[]) => initMembers().getMyBookings(...args),
  getPunchCards: (...args: any[]) => initMembers().getPunchCards(...args),
  getPunchCardHistory: (...args: any[]) => initMembers().getPunchCardHistory(...args),
  getProfile: (...args: any[]) => initMembers().getProfile(...args),
  updateProfile: (...args: any[]) => initMembers().updateProfile(...args),
  getPaymentHistory: (...args: any[]) => initMembers().getPaymentHistory(...args),
  createPaymentIntent: (...args: any[]) => initMembers().createPaymentIntent(...args),
  
  bookSession: (...args: any[]) => initMembers().bookSession(...args),
  cancelBooking: (...args: any[]) => initMembers().cancelBooking(...args),
  
  // Employee Booking (Gusmester) methods
  checkIfEmployee: (...args: any[]) => initMembers().checkIfEmployee(...args),
  getEmployeeStats: (...args: any[]) => initMembers().getEmployeeStats(...args),
  getAvailableGusmesterSpots: (...args: any[]) => initMembers().getAvailableGusmesterSpots(...args),
  getMyGusmesterBookings: (...args: any[]) => initMembers().getMyGusmesterBookings(...args),
  bookGusmesterSpot: (...args: any[]) => initMembers().bookGusmesterSpot(...args),
  cancelGusmesterBooking: (...args: any[]) => initMembers().cancelGusmesterBooking(...args),
  getMyHostingSessions: (...args: any[]) => initMembers().getMyHostingSessions(...args),
  releaseGuestSpot: (...args: any[]) => initMembers().releaseGuestSpot(...args),
  bookGuestForSession: (...args: any[]) => initMembers().bookGuestForSession(...args),
  
  // Staff Management methods
  getStaffSessions: (...args: any[]) => initMembers().getStaffSessions(...args),
  getStaffSessionParticipants: (...args: any[]) => initMembers().getStaffSessionParticipants(...args),
  
  // Administration methods
  getAdminMembers: (...args: any[]) => initMembers().getAdminMembers(...args),
  getAdminMemberDetails: (...args: any[]) => initMembers().getAdminMemberDetails(...args),
  adminCancelBooking: (...args: any[]) => initMembers().adminCancelBooking(...args),
  adminMoveBooking: (...args: any[]) => initMembers().adminMoveBooking(...args),
};
