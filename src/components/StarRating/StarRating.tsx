import styles from "./StarRating.module.css";

// Exibição (somente leitura) da média de estrelas, de 0.5 a 5, com meia estrela.

export const STAR =
	"12 2.5 14.9 8.4 21.4 9.3 16.7 13.9 17.8 20.4 12 17.3 6.2 20.4 7.3 13.9 2.6 9.3 9.1 8.4";
export const LEFT_HALF = "12 2.5 9.1 8.4 2.6 9.3 7.3 13.9 6.2 20.4 12 17.3";

interface StarRatingProps {
	/** Média de 0 a 5. null ou 0 = álbum sem avaliações. */
	value: number | null | undefined;
	size?: number;
}

export function StarRating({ value, size = 14 }: StarRatingProps) {
	if (!value) return <span className={styles.empty}>Sem avaliações</span>;

	// Arredonda para a meia estrela mais próxima.
	const rounded = Math.round(Math.min(value, 5) * 2) / 2;
	const full = Math.floor(rounded);
	const hasHalf = rounded - full === 0.5;

	return (
		<span
			className={styles.stars}
			role="img"
			aria-label={`Nota média ${rounded.toLocaleString("pt-BR")} de 5`}
		>
			{Array.from({ length: full }, (_, index) => (
				<svg
					key={index}
					width={size}
					height={size}
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<polygon points={STAR} />
				</svg>
			))}
			{hasHalf && (
				<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
					<polygon points={LEFT_HALF} />
				</svg>
			)}
		</span>
	);
}
