import { UserIcon } from "@/components/icons/icons";
import { LikeButton } from "@/components/LikeButton/LikeButton";
import { StarRating } from "@/components/StarRating/StarRating";
import type { AlbumReview } from "@/lib/api/review";
import { formatRelativeDate } from "@/lib/format";
import styles from "./ReviewList.module.css";

interface ReviewListProps {
	reviews: AlbumReview[] | null;
}

export function ReviewList({ reviews }: ReviewListProps) {
	return (
		<section className={styles.section} aria-labelledby="resenhas">
			<h2 id="resenhas" className={styles.heading}>
				Resenhas
			</h2>

			{reviews === null ? (
				<p className={styles.empty}>
					Não foi possível carregar as resenhas no momento.
				</p>
			) : reviews.length === 0 ? (
				<p className={styles.empty}>Ainda não há resenhas para este álbum.</p>
			) : (
				<ul className={styles.list}>
					{reviews.map((review) => (
						<li key={review.id} className={styles.card}>
							<div className={styles.header}>
								<div className={styles.author}>
									<span className={styles.avatar}>
										{review.user.avatarUrl ? (
											// eslint-disable-next-line @next/next/no-img-element -- avatar pode vir de qualquer domínio
											<img
												src={review.user.avatarUrl}
												alt=""
												className={styles.avatarImage}
											/>
										) : (
											<UserIcon size={16} />
										)}
									</span>
									<span className={styles.name}>{review.user.name}</span>
									<span className={styles.username}>
										@{review.user.username}
									</span>
								</div>

								<div className={styles.meta}>
									<StarRating value={review.rating} />
									<time dateTime={review.createdAt} className={styles.date}>
										{formatRelativeDate(review.createdAt)}
									</time>
								</div>
							</div>

							<p className={styles.content}>{review.content}</p>
							{/* 6.3-F2: curtir a resenha. */}
							<div className={styles.actions}>
								<LikeButton
									reviewId={review.id}
									authorId={review.user.id}
									likesCount={review.likesCount}
									likedByMe={review.likedByMe}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
