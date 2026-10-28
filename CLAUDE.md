# 작업 메모 (Claude용)

- 사용자는 특수교사. 답변은 한국어로.
- **SQL 업데이트 파일을 새로 만들거나 바꾸면, 답변 맨 끝에 그 SQL 전체를 코드 블록으로 붙여 줄 것** (사용자가 GitHub에서 복사하지 않고 채팅에서 바로 복사해 Supabase SQL Editor에 붙여넣음).
- test01(예쁘구나)은 선생님 테스트 계정 → 정답률·통계 분석에서 제외.
- Supabase MCP 연결됨 (project_id: ekuspzoycrtabcxvhpxm). 사용자가 SQL 업데이트를 **직접 적용해도 된다고 허락함** → apply_migration으로 적용하고, 그래도 답변 끝에 SQL 전체를 붙일 것.
- 페이지: index.html = 학생, teacher.html = 선생님 (window.APP_MODE, 로그인 저장 키가 다름).
