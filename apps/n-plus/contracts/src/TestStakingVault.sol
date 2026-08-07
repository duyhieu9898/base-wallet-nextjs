// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @title TestStakingVault
 * @notice A Sepolia-only integration fixture. It has no rewards, lock periods,
 *         administration, upgrade path, or production economic guarantees.
 *         Users may withdraw exactly the amount they deposited at any time.
 */
contract TestStakingVault {
    error InsufficientStake();
    error InvalidToken();
    error ReentrantCall();
    error TransferFailed();
    error ZeroAmount();

    event Staked(address indexed account, address indexed asset, uint256 amount);
    event Unstaked(address indexed account, address indexed asset, uint256 amount);

    address public immutable usdc;

    mapping(address account => uint256 amount) public nativeStakeOf;
    mapping(address account => uint256 amount) public usdcStakeOf;

    uint256 private reentrancyStatus = 1;

    constructor(address usdc_) {
        if (usdc_ == address(0) || usdc_.code.length == 0) revert InvalidToken();
        usdc = usdc_;
    }

    modifier nonReentrant() {
        if (reentrancyStatus != 1) revert ReentrantCall();
        reentrancyStatus = 2;
        _;
        reentrancyStatus = 1;
    }

    function stakeNative() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        nativeStakeOf[msg.sender] += msg.value;
        emit Staked(msg.sender, address(0), msg.value);
    }

    function unstakeNative(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (nativeStakeOf[msg.sender] < amount) revert InsufficientStake();

        nativeStakeOf[msg.sender] -= amount;
        (bool sent,) = msg.sender.call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit Unstaked(msg.sender, address(0), amount);
    }

    function stakeUsdc(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        usdcStakeOf[msg.sender] += amount;
        if (!IERC20(usdc).transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }

        emit Staked(msg.sender, usdc, amount);
    }

    function unstakeUsdc(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (usdcStakeOf[msg.sender] < amount) revert InsufficientStake();

        usdcStakeOf[msg.sender] -= amount;
        if (!IERC20(usdc).transfer(msg.sender, amount)) revert TransferFailed();

        emit Unstaked(msg.sender, usdc, amount);
    }
}
