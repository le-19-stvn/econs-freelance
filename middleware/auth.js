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
    return res.status(401).json({ error: 'Token d\'authentification manquant.' });
  }

  const token = authHeader.split(' ')[1];

  if (!JWT_SECRET) {
    console.error('❌ SUPABASE_JWT_SECRET non défini dans les variables d\'environnement.');
    return res.status(500).json({ error: 'Configuration serveur incomplète.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.sub; // Supabase stocke l'UUID dans 'sub'
    next();
  } catch (err) {
    console.error('🔒 Token invalide :', err.message);
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

module.exports = { requireAuth };
