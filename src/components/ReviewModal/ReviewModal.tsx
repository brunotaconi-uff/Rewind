"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { AlbumCover } from "@/components/AlbumCover/AlbumCover";
import { Modal } from "@/components/Modal/Modal";
import { StarInput } from "@/components/StarInput/StarInput";
import { ApiError, getErrorCode } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errorMessages";
import { loginHref } from "@/lib/callbackUrl";
import type { AlbumSummary } from "@/lib/api/music";
import {
	createReview,
	deleteReview,
	getMyReview,
	updateReview,
	type AlbumRating,
} from "@/lib/api/review";
import styles from "./ReviewModal.module.css";

const MAX_CONTENT_LENGTH = 5000;
const NO_RATING_MESSAGE = "Escolha uma nota de 1 a 5 estrelas para salvar.";

interface ReviewModalProps {
	/** Álbum sendo avaliado; null = modal fechado. */
	album: AlbumSummary | null;
	onClose: () => void;
	/** Média recalculada depois de salvar ou apagar (para atualizar o card). */
	onRatingChange?: (rating: AlbumRating) => void;
}

/** Validação e conflito trazem a mensagem do backend; os outros erros usam a mensagem padrão. */
function reviewErrorMessage(error: unknown): string {
	if (
		error instanceof ApiError &&
		(error.code === "VALIDATION_ERROR" || error.code === "CONFLICT")
	) {
		return error.message;
	}
	return getErrorMessage(getErrorCode(error));
}

export function ReviewModal({
	album,
	onClose,
	onRatingChange,
}: ReviewModalProps) {
	return (
		<Modal open={album !== null} onClose={onClose} title="Sua avaliação">
			<div className={styles.body}>
				{/* A key zera o formulário ao trocar de álbum. */}
				{album && (
					<ReviewForm
						key={album.externalId}
						album={album}
						onClose={onClose}
						onRatingChange={onRatingChange}
					/>
				)}
			</div>
		</Modal>
	);
}

function ReviewForm({
	album,
	onClose,
	onRatingChange,
}: {
	album: AlbumSummary;
	onClose: () => void;
	onRatingChange?: (rating: AlbumRating) => void;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session, status } = useSession();
	const token = session?.accessToken;
	const errorId = useId();

	const [loading, setLoading] = useState(true);
	const [reviewId, setReviewId] = useState<string | null>(null);
	const [rating, setRating] = useState(0);
	const [content, setContent] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	// 5.4-F4: se o usuário já avaliou o álbum, o modal abre com a nota e a resenha dele.
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		getMyReview(token, album.externalId)
			.then((review) => {
				if (cancelled || !review) return;
				setReviewId(review.id);
				setRating(review.rating);
				setContent(review.content ?? "");
			})
			.catch((loadError: unknown) => {
				if (!cancelled) setError(reviewErrorMessage(loadError));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [token, album.externalId]);

	if (status === "loading") {
		return <p className={styles.status}>Carregando…</p>;
	}

	if (!token) {
		return (
			<div className={styles.login}>
				<p>Faça login para avaliar este álbum.</p>
				<Link
					href={loginHref(pathname)}
					className={styles.primary}
					onClick={onClose}
				>
					Entrar
				</Link>
			</div>
		);
	}

	const handleRatingChange = (value: number) => {
		setRating(value);
		if (error === NO_RATING_MESSAGE) setError(null);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// 5.4-F3: não envia sem nota.
		if (!rating) {
			setError(NO_RATING_MESSAGE);
			return;
		}

		setSaving(true);
		setError(null);
		const input = { rating, content: content.trim() || null };
		try {
			const saved = reviewId
				? await updateReview(token, album.externalId, reviewId, input)
				: await createReview(token, album.externalId, input);
			onRatingChange?.(saved.albumRating);
			// Recarrega a página para a média e a lista de resenhas mostrarem a avaliação nova.
			router.refresh();
			onClose();
		} catch (saveError) {
			setError(reviewErrorMessage(saveError));
			setSaving(false);
		}
	};

	// Excluir pede confirmação no próprio botão (sem diálogo do navegador).
	const handleDelete = async () => {
		if (!reviewId) return;
		if (!confirmingDelete) {
			setConfirmingDelete(true);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			// Chama a API antes: com onRatingChange ausente, "?.(await …)" nem avaliaria o argumento.
			const albumRating = await deleteReview(token, album.externalId, reviewId);
			onRatingChange?.(albumRating);
			router.refresh();
			onClose();
		} catch (deleteError) {
			setError(reviewErrorMessage(deleteError));
			setSaving(false);
			setConfirmingDelete(false);
		}
	};

	const artists = album.artists.map((artist) => artist.name).join(", ");
	const disabled = loading || saving;

	return (
		<form className={styles.form} onSubmit={handleSubmit} noValidate>
			<div className={styles.album}>
				<AlbumCover
					src={album.coverUrl}
					alt={`Capa de ${album.title}`}
					className={styles.cover}
				/>
				<div className={styles.albumInfo}>
					<p className={styles.albumTitle}>{album.title}</p>
					{artists && <p className={styles.albumArtist}>{artists}</p>}
					{album.releaseYear !== null && (
						<p className={styles.albumYear}>{album.releaseYear}</p>
					)}
				</div>
			</div>

			<div className={styles.field}>
				<span className={styles.label}>Sua nota</span>
				<StarInput
					value={rating}
					onChange={handleRatingChange}
					disabled={disabled}
					describedBy={error ? errorId : undefined}
				/>
			</div>

			{/* 5.4-F2: a resenha é opcional. */}
			<label className={styles.field}>
				<span className={styles.label}>Resenha (opcional)</span>
				<textarea
					className={styles.textarea}
					value={content}
					onChange={(event) => setContent(event.target.value)}
					maxLength={MAX_CONTENT_LENGTH}
					rows={7}
					placeholder="O que você achou do álbum?"
					disabled={disabled}
				/>
				<span className={styles.counter}>
					{content.length}/{MAX_CONTENT_LENGTH}
				</span>
			</label>

			{error && (
				<p id={errorId} className={styles.error} role="alert">
					{error}
				</p>
			)}

			<div className={styles.actions}>
				{reviewId && (
					<button
						type="button"
						className={styles.danger}
						onClick={handleDelete}
						onBlur={() => setConfirmingDelete(false)}
						disabled={disabled}
					>
						{confirmingDelete ? "Confirmar exclusão" : "Excluir avaliação"}
					</button>
				)}
				<button type="button" className={styles.secondary} onClick={onClose}>
					Cancelar
				</button>
				<button type="submit" className={styles.primary} disabled={disabled}>
					{saving ? "Salvando…" : reviewId ? "Salvar alterações" : "Salvar"}
				</button>
			</div>
		</form>
	);
}
