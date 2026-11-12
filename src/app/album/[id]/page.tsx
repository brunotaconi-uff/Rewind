import { AlbumHeader } from "@/components/AlbumHeader/AlbumHeader";
import { ApiErrorMessage } from "@/components/ApiErrorMessage/ApiErrorMessage";
import { RatingCard } from "@/components/RatingCard/RatingCard";
import { ReviewList } from "@/components/ReviewList/ReviewList";
import { TrackList } from "@/components/TrackList/TrackList";
import { getErrorCode } from "@/lib/api/client";
import { getAlbum, type Album } from "@/lib/api/music";
import { getAlbumRating, getAlbumReviews } from "@/lib/api/review";
import { getServerAccessToken } from "@/lib/auth";
import styles from "./page.module.css";

interface AlbumDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

const AlbumDetailPage = async ({ params }: AlbumDetailPageProps) => {
	const { id } = await params;

	const ratingPromise = getAlbumRating(id).catch(() => null);
	const token = await getServerAccessToken();
	const reviewsPromise = getAlbumReviews(id, token).catch(() => null);

	let album: Album;
	try {
		album = await getAlbum(id);
	} catch (error) {
		return (
			<main className={styles.page}>
				<div className={styles.container}>
					<ApiErrorMessage
						code={getErrorCode(error)}
						title="Não foi possível carregar o álbum"
					/>
				</div>
			</main>
		);
	}

	const [rating, reviews] = await Promise.all([ratingPromise, reviewsPromise]);

	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<AlbumHeader album={album} />

				<div className={styles.content}>
					<div className={styles.mainColumn}>
						<TrackList tracks={album.tracks} />
					</div>
					<aside className={styles.sidebar}>
						<RatingCard album={album} rating={rating} />
					</aside>
				</div>
				<ReviewList reviews={reviews} />
			</div>
		</main>
	);
};

export default AlbumDetailPage;
