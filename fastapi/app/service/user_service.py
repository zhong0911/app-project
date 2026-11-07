"""用户业务层（对标 Spring Boot 的 service/impl/UserServiceImpl）。

职责：业务校验 + DTO → Entity → VO 转换；不关心 HTTP，也不直接拼 SQL。
"""

from sqlalchemy.orm import Session

from app.common.result_code import ResultCode
from app.core.exceptions import BusinessException
from app.models.user import User
from app.repository.user_repo import UserRepository
from app.schemas.common import PageResult
from app.schemas.user import UserCreateDTO, UserQueryDTO, UserUpdateDTO, UserVO

ALLOWED_ROLES = {"ADMIN", "USER"}


def to_vo(user: User) -> UserVO:
    """Entity → VO（隐藏内部字段，只暴露前端需要的）。"""

    return UserVO.model_validate(user)


class UserService:
    def __init__(self, db: Session) -> None:
        self.repo = UserRepository(db)

    # ---- 基础 CRUD ----
    def create_user(self, dto: UserCreateDTO) -> UserVO:
        exists = self.repo.get_by_uid_including_deleted(dto.uid)
        if exists is not None:
            if exists.deleted == 1:
                raise BusinessException(ResultCode.DATA_CONFLICT, f"该 uid 已在回收站，请先恢复: {dto.uid}")
            raise BusinessException(ResultCode.DATA_CONFLICT, f"SSO 用户已存在: {dto.uid}")

        user = User(uid=dto.uid, role="USER", status=1, deleted=0, version=1)
        return to_vo(self.repo.create(user))

    def update_user(self, dto: UserUpdateDTO) -> UserVO:
        user = self.repo.get_by_id(dto.id)
        if user is None:
            raise BusinessException(ResultCode.NOT_FOUND, f"用户不存在: {dto.id}")
        role = dto.role.upper()
        if role not in ALLOWED_ROLES:
            raise BusinessException(ResultCode.BAD_REQUEST, f"角色不合法，仅支持 ADMIN / USER: {dto.role}")
        user.role = role
        user.version += 1  # 乐观锁版本号递增（对应 MyBatis-Plus 的 @Version）
        return to_vo(self.repo.update(user))

    def delete_user(self, user_id: int) -> None:
        user = self.repo.get_by_id(user_id)
        if user is None:
            raise BusinessException(ResultCode.NOT_FOUND, f"用户不存在: {user_id}")
        self.repo.soft_delete(user)

    def get_user(self, user_id: int) -> UserVO:
        user = self.repo.get_by_id(user_id)
        if user is None:
            raise BusinessException(ResultCode.NOT_FOUND, f"用户不存在: {user_id}")
        return to_vo(user)

    def page_query(self, dto: UserQueryDTO) -> PageResult[UserVO]:
        records, total = self.repo.page(dto.pageNum, dto.pageSize, dto.uid, dto.role, dto.status, 0)
        return PageResult.build(dto.pageNum, dto.pageSize, total, [to_vo(u) for u in records])

    # ---- 管理端 ----
    def page_recycle(self, dto: UserQueryDTO) -> PageResult[UserVO]:
        records, total = self.repo.page(dto.pageNum, dto.pageSize, dto.uid, None, dto.status, 1)
        return PageResult.build(dto.pageNum, dto.pageSize, total, [to_vo(u) for u in records])

    def update_status(self, user_id: int, status: int) -> UserVO:
        if status not in (0, 1):
            raise BusinessException(ResultCode.BAD_REQUEST, "状态仅支持 0-禁用 / 1-启用")
        user = self.repo.get_by_id(user_id, include_deleted=True)
        if user is None:
            raise BusinessException(ResultCode.NOT_FOUND, f"用户不存在: {user_id}")
        user.status = status
        return to_vo(self.repo.update(user))

    def restore(self, user_id: int) -> UserVO:
        user = self.repo.get_by_id(user_id, include_deleted=True)
        if user is None or user.deleted != 1:
            raise BusinessException(ResultCode.NOT_FOUND, f"回收站中不存在该用户: {user_id}")
        return to_vo(self.repo.restore(user))

    def purge(self, user_id: int) -> None:
        user = self.repo.get_by_id(user_id, include_deleted=True)
        if user is None or user.deleted != 1:
            raise BusinessException(ResultCode.NOT_FOUND, f"回收站中不存在该用户: {user_id}")
        self.repo.purge(user)

    # ---- SSO 相关 ----
    def get_by_uid(self, uid: str) -> User | None:
        if not uid:
            return None
        return self.repo.get_by_uid(uid)

    def get_or_create_default_user(self, uid: str) -> User | None:
        """新登录用户自动注册为 USER（并发下靠唯一键兜底）。"""

        if not uid:
            return None
        existing = self.repo.get_by_uid(uid)
        if existing is not None:
            return existing
        existing = self.repo.get_by_uid_including_deleted(uid)
        if existing is not None:
            return existing
        try:
            return self.repo.create(User(uid=uid, role="USER", status=1, deleted=0, version=1))
        except Exception:
            self.repo.db.rollback()
            return self.repo.get_by_uid(uid)
