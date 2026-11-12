"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { HeartIcon } from "@/components/icons/icons";
import { ApiError, getErrorCode } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errorMessages";
import { likeReview, unlikeReview } from "@/lib/api/review";
import styles from "./LikeButton.module.css";

interface LikeButtonProps {
	/** Id da atividade (avaliação). */
	reviewId: string;
	/** Autor da atividade: na própria atividade só aparece o contador. */
	authorId: string;
	likesCount: number;
	likedByMe: boolean;
}

function likeErrorMessage(error: unknown): string {
	if (
		error instanceof ApiError &&
		(error.code === "VALIDATION_ERROR" || error.code === "NOT_FOUND")
	) {
		return error.message;
	}
	return getErrorMessage(getErrorCode(error));
}

function formatLikes(count: number): string {
	return count === 1 ? "1 curtida" : `${count} curtidas`;
}

/** 6.3: coração com o número de curtidas de uma nota ou resenha. */
export function LikeButton({
	reviewId,
	authorId,
	likesCount,
	likedByMe,
}: LikeButtonProps) {
	const router = useRouter();
	const { data: session } = useSession();
	const [like, setLike] = useState({ likesCount, likedByMe });
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// O card fala em curtir atividades "de outras pessoas".
	if (session?.user.id === authorId) {
		return (
			<span className={styles.own} title={formatLikes(like.likesCount)}>
				<HeartIcon size={16} />
				<span aria-label={formatLikes(like.likesCount)}>{like.likesCount}</span>
			</span>
		);
	}

	const handleClick = async () => {
		const token = session?.accessToken;
		if (!token) {
			router.push("/login");
			return;
		}

		// 6.3-F3: o contador muda na hora; se o backend recusar, volta ao que era.
		const previous = like;
		setLike({
			likesCount: previous.likesCount + (previous.likedByMe ? -1 : 1),
			likedByMe: !previous.likedByMe,
		});
		setSaving(true);
		setError(null);
		try {
			const saved = previous.likedByMe
				? await unlikeReview(token, reviewId)
				: await likeReview(token, reviewId);
			setLike({ likesCount: saved.likesCount, likedByMe: saved.likedByMe });
		} catch (likeError) {
			setLike(previous);
			setError(likeErrorMessage(likeError));
		} finally {
			setSaving(false);
		}
	};

	return (
		<span className={styles.wrapper}>
			<button
				type="button"
				className={
					like.likedByMe ? `${styles.button} ${styles.active}` : styles.button
				}
				aria-pressed={like.likedByMe}
				aria-label={`${like.likedByMe ? "Descurtir" : "Curtir"} (${formatLikes(like.likesCount)})`}
				title={like.likedByMe ? "Descurtir" : "Curtir"}
				onClick={handleClick}
				disabled={saving}
			>
				<HeartIcon size={16} />
				<span aria-hidden="true">{like.likesCount}</span>
			</button>
			{error && (
				<span className={styles.error} role="alert">
					{error}
				</span>
			)}
		</span>
	);
}
