"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AuthPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace('/login');
	}, [router]);

	return null;
}
