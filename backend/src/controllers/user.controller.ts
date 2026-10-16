import type { CookieOptions, Request, Response } from "express";
import pool from "../db/index.js";
import bcrypt from "bcrypt";
import {
	createAccessToken,
	createRefreshToken,
	findRefreshToken,
	saveRefreshTokenToDB,
	deleteRefreshTokenFromDB,
} from "../utils/tokens.js";
import config from "../config/index.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const cookieOptions: CookieOptions = {
	httpOnly: true,
	secure: config.node_env === "production",
	sameSite: "lax",
	maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
};

export async function registerUser(req: Request, res: Response) {
	const { email, password, name } = req.body;

	try {
		const checkUser = await pool.query(
			`SELECT id from users WHERE email = $1;`,
			[email],
		);

		if (checkUser.rows.length > 0) {
			return res
				.status(409)
				.json({ error: "Email already taken!" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const { rows } = await pool.query(
			`INSERT INTO users(name, email, hashed_password) VALUES (
				$1, $2, $3
			) RETURNING id, role, name, email`,
			[name, email, hashedPassword],
		);
		const user = rows[0];

		const accessToken = createAccessToken(user);
		const refreshToken = createRefreshToken();

		await saveRefreshTokenToDB(user.id, refreshToken);

		res.cookie("refresh_token", refreshToken, cookieOptions);
		res.status(201).json({
			access_token: accessToken,
			accessToken: accessToken,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Registration failed!" });
	}
}

export async function loginUser(req: Request, res: Response) {
	const { email, password } = req.body;

	try {
		const fetchUser = await pool.query(
			`SELECT id, role, name, email, hashed_password FROM users WHERE email = $1;`,
			[email],
		);

		if (fetchUser.rows.length === 0) {
			return res
				.status(404)
				.json({
					error: "Email doesn't exist, please register first.",
				});
		}

		const user = fetchUser.rows[0];
		const valid = await bcrypt.compare(password, user.hashed_password);
		if (!valid) {
			return res.status(400).json({ error: "Wrong Password!" });
		}

		const payloadData = {
			id: user.id,
			role: user.role,
			name: user.name,
			email: user.email,
		};

		const accessToken = createAccessToken(payloadData);
		const refreshToken = createRefreshToken();

		await saveRefreshTokenToDB(user.id, refreshToken);

		res.cookie("refresh_token", refreshToken, cookieOptions);
		res.json({
			access_token: accessToken,
			accessToken: accessToken,
			user: payloadData,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Login failed!" });
	}
}

export async function generateNewAccess(req: Request, res: Response) {
	const refreshToken = req.cookies?.refresh_token;

	if (!refreshToken) {
		return res.status(401).json({ error: "No refresh token" });
	}

	try {
		const tokenData = await findRefreshToken(refreshToken);

		if (!tokenData) {
			return res
				.status(401)
				.json({ error: "Invalid or expired refresh token!" });
		}

		const newAccessToken = createAccessToken({
			id: tokenData.id,
			role: tokenData.role,
			name: tokenData.name,
			email: tokenData.email,
		});

		res.json({
			access_token: newAccessToken,
			accessToken: newAccessToken,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Token refresh failed" });
	}
}

export async function logoutUser(req: Request, res: Response) {
	const refreshToken = req.cookies?.refresh_token;

	if (refreshToken) {
		try {
			await deleteRefreshTokenFromDB(refreshToken);
		} catch (err) {
			console.error("Failed to delete refresh token from DB:", err);
		}
	}

	res.clearCookie("refresh_token", cookieOptions);
	res.json({ message: "Signed out successfully" });
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
	if (!req.user) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const { rows } = await pool.query(
			`SELECT id, role, name, email FROM users WHERE id = $1`,
			[req.user.id],
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to fetch user profile" });
	}
}
