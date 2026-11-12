"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { LEFT_HALF, STAR } from "@/components/StarRating/StarRating";
import styles from "./StarInput.module.css";

const MIN = 1;
const MAX = 5;

interface StarInputProps {
	/** 0 = nenhuma nota escolhida ainda. */
	value: number;
	onChange: (value: number) => void;
	size?: number;
	disabled?: boolean;
	/** id do texto que descreve o campo (ex.: a mensagem de erro). */
	describedBy?: string;
}

export function formatRating(value: number): string {
	return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Clicar na metade esquerda da estrela dá meia estrela; na direita, a estrela inteira. */
function valueFromPointer(
	event: MouseEvent<HTMLSpanElement>,
	star: number,
): number {
	const { left, width } = event.currentTarget.getBoundingClientRect();
	const value = event.clientX - left < width / 2 ? star - 0.5 : star;
	return Math.max(MIN, value);
}

export function StarInput({
	value,
	onChange,
	size = 32,
	disabled = false,
	describedBy,
}: StarInputProps) {
	const [hover, setHover] = useState<number | null>(null);
	const shown = hover ?? value;

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const current = value || 0;
		let next: number | null = null;
		if (event.key === "ArrowRight" || event.key === "ArrowUp")
			next = Math.min(MAX, Math.max(MIN, current + 0.5));
		if (event.key === "ArrowLeft" || event.key === "ArrowDown")
			next = Math.max(MIN, current - 0.5);
		if (event.key === "Home") next = MIN;
		if (event.key === "End") next = MAX;
		if (next === null) return;
		event.preventDefault();
		onChange(next);
	};

	return (
		<div className={styles.wrapper}>
			<div
				role="slider"
				tabIndex={disabled ? -1 : 0}
				aria-label="Nota"
				aria-valuemin={MIN}
				aria-valuemax={MAX}
				aria-valuenow={value || undefined}
				aria-valuetext={
					value ? `${formatRating(value)} de 5 estrelas` : "Sem nota"
				}
				aria-describedby={describedBy}
				aria-disabled={disabled || undefined}
				className={styles.stars}
				onKeyDown={disabled ? undefined : handleKeyDown}
				onMouseLeave={() => setHover(null)}
			>
				{[1, 2, 3, 4, 5].map((star) => {
					const full = shown >= star;
					const half = !full && shown >= star - 0.5;
					return (
						<span
							key={star}
							className={styles.star}
							onMouseMove={
								disabled
									? undefined
									: (event) => setHover(valueFromPointer(event, star))
							}
							onClick={
								disabled
									? undefined
									: (event) => onChange(valueFromPointer(event, star))
							}
						>
							<svg
								width={size}
								height={size}
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<polygon
									points={STAR}
									className={full ? styles.filled : styles.empty}
								/>
								{half && (
									<polygon points={LEFT_HALF} className={styles.filled} />
								)}
							</svg>
						</span>
					);
				})}
			</div>
			<span className={styles.value} aria-hidden="true">
				{shown ? formatRating(shown) : "–"}
			</span>
		</div>
	);
}
