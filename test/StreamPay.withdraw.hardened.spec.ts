import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StreamPay - Hardened Withdraw (Issue #6)", function () {
  async function deployFixture() {
    const [sender, recipient, attacker] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    const deposit = ethers.parseEther("100");
    await token.mint(sender.address, deposit);
    await token.connect(sender).approve(await sp.getAddress(), deposit);

    const now = await time.latest();
    const start = now + 10;
    const cliff = start + 50;
    const end = start + 200;

    await sp.connect(sender).createStream(
      await token.getAddress(),
      recipient.address,
      deposit,
      start,
      cliff,
      end,
      true
    );

    await time.increaseTo(cliff + 20);

    return { sp, token, sender, recipient, attacker, deposit };
  }

  it("allows partial withdrawals", async function () {
    const { sp, token, recipient } = await deployFixture();

    const available = await sp.withdrawableAmount(1);
    const partial = available / 2n;

    const balanceBefore = await token.balanceOf(recipient.address);

    await sp.connect(recipient).withdraw(1, partial);

    const balanceAfter = await token.balanceOf(recipient.address);

    expect(balanceAfter - balanceBefore).to.equal(partial);
  });

  it("allows full withdrawal of available amount", async function () {
    const { sp, recipient } = await deployFixture();

    const available = await sp.withdrawableAmount(1);
    await sp.connect(recipient).withdraw(1, available);

    expect(await sp.withdrawableAmount(1)).to.equal(0n);
  });

  it("prevents withdrawing more than available", async function () {
    const { sp, recipient } = await deployFixture();

    const available = await sp.withdrawableAmount(1);

    await expect(
      sp.connect(recipient).withdraw(1, available + 1n)
    ).to.be.reverted;
  });

  it("prevents zero withdrawals", async function () {
    const { sp, recipient } = await deployFixture();

    await expect(
      sp.connect(recipient).withdraw(1, 0)
    ).to.be.reverted;
  });

  it("prevents non-recipient from withdrawing", async function () {
    const { sp, attacker } = await deployFixture();

    await expect(
      sp.connect(attacker).withdraw(1, 1)
    ).to.be.reverted;
  });

  it("withdrawn accounting updates correctly", async function () {
    const { sp, recipient } = await deployFixture();

    const available = await sp.withdrawableAmount(1);
    const partial = available / 3n;

    await sp.connect(recipient).withdraw(1, partial);

    const stream = await sp.getStream(1);
    expect(stream.withdrawn).to.equal(partial);
  });

  it("withdrawable never negative after full withdrawal", async function () {
    const { sp, recipient } = await deployFixture();

    const available = await sp.withdrawableAmount(1);
    await sp.connect(recipient).withdraw(1, available);

    expect(await sp.withdrawableAmount(1)).to.equal(0n);
  });
});
