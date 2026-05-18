export type ParseIssue = {
  code: string;
  message: string;
  location?: string;
};

export type ParseResult<T> = {
  value: T;
  errors: ParseIssue[];
};

export type SectionContent = {
  body: string;
  startLine: number;
};
