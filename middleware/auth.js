const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

/**
 * Middleware d'authentification Supabase.
 * Vérifie le token JWT dans le header Authorization: Bearer <token>
 * et ajoute req.userId (UUID) à la requête.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('🔒 401 — Pas de header Authorization pour:', req.method, req.originalUrl);
    return res.status(401).json({ error: 'Token d\'authentification manquant.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    console.warn('🔒 401 — Token vide/null pour:', req.method, req.originalUrl);
    return res.status(401).json({ error: 'Token vide.' });
  }

  if (!JWT_SECRET) {
    console.error('❌ SUPABASE_JWT_SECRET non défini ! Ajoutez-le dans Vercel : Settings → Environment Variables');
    console.error('   → Trouvez-le dans Supabase : Settings → API → JWT Secret');
    return res.status(500).json({ 
      error: 'Configuration serveur incomplète.',
      hint: 'La variable SUPABASE_JWT_SECRET n\'est pas définie sur le serveur.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.sub; // Supabase stocke l'UUID dans 'sub'
    console.log('✅ Auth OK — user:', decoded.sub?.substring(0, 8) + '...', req.method, req.originalUrl);
    next();
  } catch (err) {
    console.error('🔒 Token invalide :', err.message, '— pour:', req.method, req.originalUrl);
    return res.status(401).json({ error: 'Token invalide ou expiré.', details: err.message });
  }
}

module.exports = { requireAuth };
