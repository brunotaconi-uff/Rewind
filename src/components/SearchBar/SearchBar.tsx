"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SearchIcon } from "@/components/icons/icons";
import styles from "./SearchBar.module.css";

export const SEARCH_PATH = "/busca";

interface SearchFormProps {
  initialQuery: string;
  initialType: "albums" | "users";
}

function SearchForm({ initialQuery, initialType }: SearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    // Busca vazia também vai para a tela de busca, que mostra a orientação.
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    if (type === "users") params.set("type", "users");
    router.push(params.size ? `${SEARCH_PATH}?${params}` : SEARCH_PATH);
  };

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <SearchIcon size={20} />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={styles.input}
        placeholder={type === "users" ? "Buscar pelo nome de usuário..." : "Procure por artistas, álbuns e mais..."}
        aria-label={type === "users" ? "Buscar usuários pelo nome de usuário" : "Buscar álbuns por nome ou artista"}
        autoComplete="off"
      />
      <select
        className={styles.type}
        aria-label="Tipo de busca"
        value={type}
        onChange={(event) => setType(event.target.value as "albums" | "users")}
      >
        <option value="albums">Álbuns</option>
        <option value="users">Pessoas</option>
      </select>
    </form>
  );
}

/** Na tela de busca, o campo mostra o termo atual da URL. */
function SearchFormWithCurrentQuery() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = pathname === SEARCH_PATH ? (searchParams.get("q") ?? "") : "";
  const currentType = pathname === SEARCH_PATH && searchParams.get("type") === "users" ? "users" : "albums";

  // A key recria o formulário quando o termo da URL muda (ex.: voltar no navegador).
  return <SearchForm key={`${currentQuery}:${currentType}`} initialQuery={currentQuery} initialType={currentType} />;
}

// useSearchParams exige um Suspense em volta; o fallback é o mesmo campo, vazio.
export function SearchBar() {
  return (
    <Suspense fallback={<SearchForm initialQuery="" initialType="albums" />}>
      <SearchFormWithCurrentQuery />
    </Suspense>
  );
}
