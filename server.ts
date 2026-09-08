import express from "express";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const { Pool } = pg;

const PORT = 3000;
const app = express();

app.use(express.json({ limit: "50mb" }));

// PostgreSQL Pool configuration
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_VaeY0tOMN5xI@ep-twilight-haze-ae37ye57-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let pool: pg.Pool | null = null;
let isDbConnected = false;
let lastDbError: string | null = null;

try {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
    isDbConnected = false;
    lastDbError = err.message;
  });
} catch (e: any) {
  console.error("Failed to initialize PostgreSQL pool:", e);
  lastDbError = e.message;
}

// Password hashing helper using native Node.js crypto
function hashPassword(password: string): string {
  const salt = "df_salt_987654";
  return crypto.pbkdf2Sync(password, salt, 1000, 32, "sha256").toString("hex");
}

function generateToken(userId: string): string {
  const payload = `${userId}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
  return Buffer.from(payload).toString("base64");
}



// Ensure database tables and initial schema exist
async function initDatabase() {
  if (!pool) return;
  try {
    const client = await pool.connect();
    try {
      // 1. Users Table for Auth Login
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255),
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. People Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS people (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 3. Transactions Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(100) PRIMARY KEY,
          person_id VARCHAR(100) REFERENCES people(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          amount NUMERIC(14, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'IQD',
          description TEXT,
          date VARCHAR(20) NOT NULL,
          due_date VARCHAR(20),
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 4. Expenses Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id VARCHAR(100) PRIMARY KEY,
          person_name VARCHAR(255) NOT NULL,
          amount NUMERIC(14, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'IQD',
          reason TEXT NOT NULL,
          date VARCHAR(20) NOT NULL,
          category VARCHAR(100) DEFAULT 'عام',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 5. Income Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS income (
          id VARCHAR(100) PRIMARY KEY,
          source_person VARCHAR(255),
          amount NUMERIC(14, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'IQD',
          reason TEXT NOT NULL,
          date VARCHAR(20) NOT NULL,
          category VARCHAR(100) DEFAULT 'عام',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 6. Backups Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS backups (
          id VARCHAR(100) PRIMARY KEY,
          backup_type VARCHAR(50) NOT NULL,
          summary JSONB,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Migrations: Add currency column if not exists in older tables
      await client.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IQD';");
      await client.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IQD';");
      await client.query("ALTER TABLE income ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IQD';");

      // User 'mothana' Setup
      const mothanaHash = hashPassword("admin123admin123");
      const userRes = await client.query("SELECT * FROM users WHERE LOWER(username) = 'mothana';");
      if (userRes.rows.length === 0) {
        await client.query(
          `INSERT INTO users (id, username, email, password_hash, full_name, role)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            "u_mothana",
            "mothana",
            "mothana@df.com",
            mothanaHash,
            "مثنى (المدير)",
            "admin",
          ]
        );
        console.log("User mothana created: mothana / admin123admin123");
      } else {
        await client.query(
          "UPDATE users SET password_hash = $1, full_name = $2 WHERE LOWER(username) = 'mothana';",
          [mothanaHash, "مثنى (المدير)"]
        );
        console.log("User mothana credentials verified.");
      }



      isDbConnected = true;
      lastDbError = null;
      console.log("PostgreSQL database initialized successfully.");
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error initializing PostgreSQL database:", err.message);
    isDbConnected = false;
    lastDbError = err.message;
  }
}

// API Routes

// Health & DB Status
app.get("/api/status", async (req, res) => {
  let dbOk = false;
  let stats = { peopleCount: 0, transCount: 0 };
  if (pool) {
    try {
      const ping = await pool.query("SELECT NOW() as now, COUNT(*) as pcount FROM people");
      const tping = await pool.query("SELECT COUNT(*) as tcount FROM transactions");
      dbOk = true;
      isDbConnected = true;
      lastDbError = null;
      stats.peopleCount = parseInt(ping.rows[0].pcount, 10);
      stats.transCount = parseInt(tping.rows[0].tcount, 10);
    } catch (e: any) {
      dbOk = false;
      isDbConnected = false;
      lastDbError = e.message;
    }
  }
  res.json({
    status: "ok",
    databaseConnected: dbOk,
    error: lastDbError,
    cloudProvider: "Neon PostgreSQL",
    serverTime: new Date().toISOString(),
    stats,
  });
});



// ========================
// AUTHENTICATION ROUTES
// ========================

app.post("/api/auth/login", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  try {
    const cleanUsername = username.trim().toLowerCase();
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1",
      [cleanUsername]
    );

    if (result.rows.length === 0) {
      if (cleanUsername === 'mothana' && password === 'admin123admin123') {
        const mothanaHash = hashPassword("admin123admin123");
        const ins = await pool.query(
          `INSERT INTO users (id, username, email, password_hash, full_name, role)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, username, email, full_name, role, created_at`,
          ["u_mothana", "mothana", "mothana@df.com", mothanaHash, "مثنى (المدير)", "admin"]
        );
        const newUser = ins.rows[0];
        const token = generateToken(newUser.id);
        return res.json({
          success: true,
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            fullName: newUser.full_name,
            role: newUser.role,
            createdAt: newUser.created_at,
          },
        });
      }
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    const user = result.rows[0];
    const incomingHash = hashPassword(password);

    if (user.password_hash !== incomingHash) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { username, email, password, fullName } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: "يرجى ملء جميع الحقول المطلوبة" });
  }

  try {
    const checkUser = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR (email IS NOT NULL AND email = $2)",
      [username.trim(), email ? email.trim() : null]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "اسم المستخدم أو البريد مسجل مسبقاً" });
    }

    const userId = "u_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const passHash = hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, full_name, role, created_at`,
      [userId, username.trim(), email ? email.trim() : null, passHash, fullName.trim(), "admin"]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser.id);

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        createdAt: newUser.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "غير مصرح" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    if (!userId) {
      return res.status(401).json({ error: "جلسة غير صالحة" });
    }

    const result = await pool.query(
      "SELECT id, username, email, full_name, role, created_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    const u = result.rows[0];
    res.json({
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        createdAt: u.created_at,
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: "رمز الدخول غير صالح" });
  }
});

// ========================
// UNIFIED DATA SYNC
// ========================

app.get("/api/data", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "Database not configured" });
  }

  try {
    const peopleRes = await pool.query("SELECT * FROM people ORDER BY name ASC");
    const transRes = await pool.query("SELECT * FROM transactions ORDER BY date DESC, created_at DESC");
    const expensesRes = await pool.query("SELECT * FROM expenses ORDER BY date DESC, created_at DESC");
    const incomeRes = await pool.query("SELECT * FROM income ORDER BY date DESC, created_at DESC");
    const backupsRes = await pool.query("SELECT id, backup_type, summary, created_at FROM backups ORDER BY created_at DESC LIMIT 10");

    res.json({
      people: peopleRes.rows.map((r) => ({
        ...r,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      transactions: transRes.rows.map((r) => ({
        id: r.id,
        personId: r.person_id,
        type: r.type,
        amount: parseFloat(r.amount),
        currency: r.currency || "IQD",
        description: r.description,
        date: r.date,
        dueDate: r.due_date,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      expenses: expensesRes.rows.map((r) => ({
        id: r.id,
        personName: r.person_name,
        amount: parseFloat(r.amount),
        currency: r.currency || "IQD",
        reason: r.reason,
        date: r.date,
        category: r.category,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      income: incomeRes.rows.map((r) => ({
        id: r.id,
        sourcePerson: r.source_person,
        amount: parseFloat(r.amount),
        currency: r.currency || "IQD",
        reason: r.reason,
        date: r.date,
        category: r.category,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      backups: backupsRes.rows.map((r) => ({
        id: r.id,
        backupType: r.backup_type,
        summary: r.summary,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: err.message });
  }
});

// People CRUD
app.post("/api/people", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id, name, phone, notes } = req.body;
  const personId = id || "p_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  try {
    const result = await pool.query(
      `INSERT INTO people (id, name, phone, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [personId, name, phone || "", notes || ""]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/people/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;
  const { name, phone, notes } = req.body;

  try {
    const result = await pool.query(
      `UPDATE people
       SET name = $1, phone = $2, notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, phone || "", notes || "", id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/people/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM people WHERE id = $1", [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions CRUD (Debts & Payments)
app.post("/api/transactions", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id, personId, type, amount, currency, description, date, dueDate, status } = req.body;
  const transId = id || "t_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  try {
    const result = await pool.query(
      `INSERT INTO transactions (id, person_id, type, amount, currency, description, date, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        transId,
        personId,
        type, // 'debt' or 'payment'
        amount,
        currency || "IQD",
        description || "",
        date || new Date().toISOString().split("T")[0],
        dueDate || null,
        status || (type === "payment" ? "completed" : "pending"),
      ]
    );
    const r = result.rows[0];
    res.json({
      id: r.id,
      personId: r.person_id,
      type: r.type,
      amount: parseFloat(r.amount),
      currency: r.currency || "IQD",
      description: r.description,
      date: r.date,
      dueDate: r.due_date,
      status: r.status,
      createdAt: r.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/transactions/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;
  const { type, amount, currency, description, date, dueDate, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE transactions
       SET type = $1, amount = $2, currency = $3, description = $4, date = $5, due_date = $6, status = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [type, amount, currency || "IQD", description || "", date, dueDate || null, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      personId: r.person_id,
      type: r.type,
      amount: parseFloat(r.amount),
      currency: r.currency || "IQD",
      description: r.description,
      date: r.date,
      dueDate: r.due_date,
      status: r.status,
      updatedAt: r.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM transactions WHERE id = $1", [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Expenses CRUD (المصروفات)
app.post("/api/expenses", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id, personName, amount, currency, reason, date, category } = req.body;
  const expId = id || "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  try {
    const result = await pool.query(
      `INSERT INTO expenses (id, person_name, amount, currency, reason, date, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        expId,
        personName,
        amount,
        currency || "IQD",
        reason,
        date || new Date().toISOString().split("T")[0],
        category || "عام",
      ]
    );
    const r = result.rows[0];
    res.json({
      id: r.id,
      personName: r.person_name,
      amount: parseFloat(r.amount),
      currency: r.currency || "IQD",
      reason: r.reason,
      date: r.date,
      category: r.category,
      createdAt: r.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/expenses/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;
  const { personName, amount, currency, reason, date, category } = req.body;

  try {
    const result = await pool.query(
      `UPDATE expenses
       SET person_name = $1, amount = $2, currency = $3, reason = $4, date = $5, category = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [personName, amount, currency || "IQD", reason, date, category || "عام", id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      personName: r.person_name,
      amount: parseFloat(r.amount),
      currency: r.currency || "IQD",
      reason: r.reason,
      date: r.date,
      category: r.category,
      updatedAt: r.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM expenses WHERE id = $1", [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Income CRUD (المقبوضات)
app.post("/api/income", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id, sourcePerson, amount, currency, reason, date, category } = req.body;
  const incId = id || "inc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  try {
    const result = await pool.query(
      `INSERT INTO income (id, source_person, amount, currency, reason, date, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        incId,
        sourcePerson || "",
        amount,
        currency || "IQD",
        reason,
        date || new Date().toISOString().split("T")[0],
        category || "عام",
      ]
    );
    const r = result.rows[0];
    res.json({
      id: r.id,
      sourcePerson: r.source_person,
      amount: parseFloat(r.amount),
      currency: r.currency || "IQD",
      reason: r.reason,
      date: r.date,
      category: r.category,
      createdAt: r.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/income/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;
  const { sourcePerson, amount, currency, reason, date, category } = req.body;

  try {
    const result = await pool.query(
      `UPDATE income
       SET source_person = $1, amount = $2, currency = $3, reason = $4, date = $5, category = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [sourcePerson || "", amount, currency || "IQD", reason, date, category || "عام", id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Income record not found" });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      sourcePerson: r.source_person,
      amount: parseFloat(r.amount),
      currency: r.currency || "IQD",
      reason: r.reason,
      date: r.date,
      category: r.category,
      updatedAt: r.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/income/:id", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM income WHERE id = $1", [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Backup System
async function performBackup(backupType: "auto" | "manual") {
  if (!pool) return null;
  const people = await pool.query("SELECT * FROM people");
  const transactions = await pool.query("SELECT * FROM transactions");
  const expenses = await pool.query("SELECT * FROM expenses");
  const income = await pool.query("SELECT * FROM income");

  const fullData = {
    people: people.rows,
    transactions: transactions.rows,
    expenses: expenses.rows,
    income: income.rows,
    timestamp: new Date().toISOString(),
  };

  const summary = {
    peopleCount: people.rows.length,
    transactionsCount: transactions.rows.length,
    expensesCount: expenses.rows.length,
    incomeCount: income.rows.length,
  };

  const backupId = "b_" + Date.now();
  await pool.query(
    "INSERT INTO backups (id, backup_type, summary, data) VALUES ($1, $2, $3, $4)",
    [backupId, backupType, JSON.stringify(summary), JSON.stringify(fullData)]
  );

  return { id: backupId, backupType, summary, createdAt: new Date() };
}

app.post("/api/backup", async (req, res) => {
  try {
    const backup = await performBackup(req.body.type || "manual");
    res.json({ success: true, backup });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/backups", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  try {
    const result = await pool.query(
      "SELECT id, backup_type, summary, created_at FROM backups ORDER BY created_at DESC LIMIT 20"
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore backup
app.post("/api/restore", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Database not connected" });
  const { backupId, directData } = req.body;

  try {
    let payload = directData;
    if (backupId) {
      const bRes = await pool.query("SELECT data FROM backups WHERE id = $1", [backupId]);
      if (bRes.rows.length === 0) return res.status(404).json({ error: "Backup not found" });
      payload = bRes.rows[0].data;
    }

    if (!payload || !payload.people) {
      return res.status(400).json({ error: "Invalid backup data structure" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM transactions");
      await client.query("DELETE FROM people");
      await client.query("DELETE FROM expenses");
      await client.query("DELETE FROM income");

      for (const p of payload.people) {
        await client.query(
          "INSERT INTO people (id, name, phone, notes, created_at) VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))",
          [p.id, p.name, p.phone || "", p.notes || "", p.created_at || p.createdAt || null]
        );
      }

      for (const t of payload.transactions || []) {
        await client.query(
          `INSERT INTO transactions (id, person_id, type, amount, currency, description, date, due_date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()))`,
          [
            t.id,
            t.person_id || t.personId,
            t.type,
            t.amount,
            t.currency || "IQD",
            t.description || "",
            t.date,
            t.due_date || t.dueDate || null,
            t.status || "pending",
            t.created_at || t.createdAt || null,
          ]
        );
      }

      for (const e of payload.expenses || []) {
        await client.query(
          `INSERT INTO expenses (id, person_name, amount, currency, reason, date, category, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))`,
          [
            e.id,
            e.person_name || e.personName,
            e.amount,
            e.currency || "IQD",
            e.reason,
            e.date,
            e.category || "عام",
            e.created_at || e.createdAt || null,
          ]
        );
      }

      for (const inc of payload.income || []) {
        await client.query(
          `INSERT INTO income (id, source_person, amount, currency, reason, date, category, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))`,
          [
            inc.id,
            inc.source_person || inc.sourcePerson || "",
            inc.amount,
            inc.currency || "IQD",
            inc.reason,
            inc.date,
            inc.category || "عام",
            inc.created_at || inc.createdAt || null,
          ]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Restored successfully" });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Automatic periodic backup every 30 minutes in background
setInterval(() => {
  performBackup("auto").catch((err) => {
    console.error("Auto backup error:", err?.message);
  });
}, 30 * 60 * 1000);

// Initialize DB and launch Express server
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
} else {
  initDatabase().catch(console.error);
}

export default app;
