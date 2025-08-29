import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  
  User? _user;
  UserModel? _userModel;
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  User? get user => _user;
  UserModel? get userModel => _userModel;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _initializeAuth();
  }

  // Initialize authentication state
  void _initializeAuth() {
    _authService.authStateChanges.listen((User? user) async {
      _user = user;
      if (user != null) {
        await _loadUserModel();
      } else {
        _userModel = null;
      }
      notifyListeners();
    });
  }

  // Load user model from Firestore
  Future<void> _loadUserModel() async {
    if (_user == null) return;
    
    try {
      _userModel = await _authService.getUserDocument(_user!.uid);
    } catch (e) {
      _errorMessage = e.toString();
    }
  }

  // Sign in with email and password
  Future<bool> signInWithEmailAndPassword(String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final credential = await _authService.signInWithEmailAndPassword(email, password);
      _setLoading(false);
      return credential != null;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Create user with email and password
  Future<bool> createUserWithEmailAndPassword(
    String email,
    String password,
    String displayName,
  ) async {
    _setLoading(true);
    _clearError();

    try {
      final credential = await _authService.createUserWithEmailAndPassword(
        email,
        password,
        displayName,
      );
      _setLoading(false);
      return credential != null;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Sign in with Google
  Future<bool> signInWithGoogle() async {
    _setLoading(true);
    _clearError();

    try {
      final credential = await _authService.signInWithGoogle();
      _setLoading(false);
      return credential != null;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Sign out
  Future<void> signOut() async {
    _setLoading(true);
    _clearError();

    try {
      await _authService.signOut();
      _user = null;
      _userModel = null;
      _setLoading(false);
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
    }
  }

  // Reset password
  Future<bool> resetPassword(String email) async {
    _setLoading(true);
    _clearError();

    try {
      await _authService.resetPassword(email);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Update user profile
  Future<bool> updateUserProfile({
    String? displayName,
    String? photoURL,
    String? phone,
    String? address,
  }) async {
    if (_user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      // Update Firebase Auth profile
      if (displayName != null || photoURL != null) {
        await _authService.updateUserProfile(
          displayName: displayName,
          photoURL: photoURL,
        );
      }

      // Update Firestore document
      final updateData = <String, dynamic>{};
      if (displayName != null) updateData['displayName'] = displayName;
      if (photoURL != null) updateData['photoURL'] = photoURL;
      if (phone != null) updateData['phone'] = phone;
      if (address != null) updateData['address'] = address;

      if (updateData.isNotEmpty) {
        await _authService.updateUserDocument(_user!.uid, updateData);
        await _loadUserModel(); // Reload user model
      }

      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Reload user data
  Future<void> reloadUser() async {
    if (_user == null) return;

    try {
      await _user!.reload();
      _user = _authService.currentUser;
      await _loadUserModel();
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _errorMessage = error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _clearError();
  }
}

