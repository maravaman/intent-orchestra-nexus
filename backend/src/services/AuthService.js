import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class AuthService {
  constructor(mysqlConnection) {
    this.mysql = mysqlConnection;
    this.jwtSecret = process.env.JWT_SECRET;
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  generateUserId() {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, this.bcryptRounds);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async register(userData) {
    const { username, email, password, fullName } = userData;
    
    try {
      // Check if user already exists
      const [existingUsers] = await this.mysql.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUsers.length > 0) {
        throw new Error('Username or email already exists');
      }

      // Create new user
      const userId = this.generateUserId();
      const sessionId = this.generateSessionId();
      const passwordHash = await this.hashPassword(password);

      const user = {
        id: userId,
        username,
        email,
        password_hash: passwordHash,
        full_name: fullName || username,
        session_id: sessionId,
        preferences: JSON.stringify({
          preferredAgents: [],
          responseFormat: 'detailed',
          language: 'en',
          theme: 'dark'
        }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.mysql.execute(
        'INSERT INTO users (id, username, email, password_hash, full_name, session_id, preferences, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.username, user.email, user.password_hash, user.full_name, user.session_id, user.preferences, user.is_active, user.created_at, user.updated_at]
      );

      // Generate JWT token
      const token = this.generateToken({
        userId: user.id,
        username: user.username,
        sessionId: user.session_id
      });

      // Store session
      await this.storeSession(user.id, token);

      console.log(`[AUTH] User registered: ${username} (${userId})`);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          sessionId: user.session_id,
          preferences: JSON.parse(user.preferences),
          createdAt: user.created_at
        },
        token
      };
    } catch (error) {
      console.error('[AUTH] Registration error:', error);
      throw error;
    }
  }

  async login(credentials) {
    const { username, password } = credentials;
    
    try {
      // Find user by username or email
      const [users] = await this.mysql.execute(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
        [username, username]
      );

      if (users.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login and generate new session
      const sessionId = this.generateSessionId();
      await this.mysql.execute(
        'UPDATE users SET session_id = ?, last_login = ?, updated_at = ? WHERE id = ?',
        [sessionId, new Date(), new Date(), user.id]
      );

      // Generate JWT token
      const token = this.generateToken({
        userId: user.id,
        username: user.username,
        sessionId: sessionId
      });

      // Store session
      await this.storeSession(user.id, token);

      console.log(`[AUTH] User logged in: ${user.username} (${user.id})`);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          sessionId: sessionId,
          preferences: JSON.parse(user.preferences || '{}'),
          lastLogin: new Date(),
          createdAt: user.created_at
        },
        token
      };
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      throw error;
    }
  }

  async storeSession(userId, token, ipAddress = null, userAgent = null) {
    try {
      const sessionId = uuidv4();
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.mysql.execute(
        'INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, userId, tokenHash, ipAddress, userAgent, expiresAt]
      );

      // Clean expired sessions
      await this.mysql.execute(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      );

      return sessionId;
    } catch (error) {
      console.error('[AUTH] Session storage error:', error);
      throw error;
    }
  }

  async validateSession(token) {
    try {
      const decoded = this.verifyToken(token);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const [sessions] = await this.mysql.execute(
        'SELECT us.*, u.username, u.email, u.full_name, u.preferences, u.is_active FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.token_hash = ? AND us.expires_at > NOW() AND u.is_active = TRUE',
        [tokenHash]
      );

      if (sessions.length === 0) {
        throw new Error('Invalid or expired session');
      }

      const session = sessions[0];
      return {
        userId: session.user_id,
        username: session.username,
        email: session.email,
        fullName: session.full_name,
        preferences: JSON.parse(session.preferences || '{}'),
        sessionId: decoded.sessionId
      };
    } catch (error) {
      throw new Error('Invalid session');
    }
  }

  async logout(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await this.mysql.execute(
        'DELETE FROM user_sessions WHERE token_hash = ?',
        [tokenHash]
      );
      console.log('[AUTH] User logged out');
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const [users] = await this.mysql.execute(
        'SELECT id, username, email, full_name, session_id, preferences, last_login, created_at, updated_at FROM users WHERE id = ? AND is_active = TRUE',
        [userId]
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        sessionId: user.session_id,
        preferences: JSON.parse(user.preferences || '{}'),
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      console.error('[AUTH] Get user error:', error);
      return null;
    }
  }
}