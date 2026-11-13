import Link from "next/link";
import { Avatar } from "@/components/Avatar/Avatar";
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
				{reviews && reviews.length > 0 && (
					<span className={styles.headingCount}> ({reviews.length})</span>
				)}
			</h2>

			{reviews === null ? (
				<p className={styles.empty}>
					Não foi possível carregar as resenhas no momento.
				</p>
			) : reviews.length === 0 ? (
				<p className={styles.empty}>
					Ainda não há resenhas para este álbum. Que tal escrever a primeira?
				</p>
			) : (
				<ul className={styles.list}>
					{reviews.map((review) => (
						<li key={review.id} className={styles.card}>
							<div className={styles.header}>
								{/* O autor leva ao perfil dele. */}
								<Link
									href={`/profile/${encodeURIComponent(review.user.username)}`}
									className={styles.author}
								>
									<Avatar
										src={review.user.avatarUrl}
										name={review.user.name}
										size={28}
									/>
									<span className={styles.name}>{review.user.name}</span>
									<span className={styles.username}>
										@{review.user.username}
									</span>
								</Link>

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
